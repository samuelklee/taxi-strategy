import numpy as np
import pandas as pd
from itertools import product

import memoize

#load dataframes
print 'Loading shit...'
reward_pd           = pd.read_pickle('app/static/dy/mdp_files/reward_pd.pkl')
dist_pd             = pd.read_pickle('app/static/dy/mdp_files/dist_pd.pkl')
euclid_dist_pd      = pd.read_pickle('app/static/dy/mdp_files/euclid_dist_pd.pkl')
dropoff_pd          = pd.read_pickle('app/static/dy/mdp_files/dropoff_pd.pkl')
prob_pickup_pd      = pd.read_pickle('app/static/dy/mdp_files/prob_pickup_pd.pkl')
zonetimes_pd        = pd.read_pickle('app/static/dy/mdp_files/zonetimes_pd.pkl')
zone_times_shift_pd = pd.read_pickle('app/static/dy/mdp_files/zone_times_shift_pd.pkl')
zone_matrix         = np.load('app/static/dy/mdp_files/zone_matrix_40x40.dat')
print 'Shit loaded!'

#make dictionaries and other things from dataframes
reward_dict         = reward_pd.to_dict()
dist_dict           = dist_pd.to_dict()
euclid_dist_dict    = euclid_dist_pd.to_dict()
dropoff_dict        = dropoff_pd.to_dict()
prob_pickup_dict    = prob_pickup_pd.prob_pickup.to_dict()
zonetimes_to_zone_dict      = dict(zip(zonetimes_pd.zone_time_renamed, zonetimes_pd.zone))
zonetimes_to_time_bin_dict  = dict(zip(zonetimes_pd.zone_time_renamed, zonetimes_pd.time_bin))

num_zones           = 251
zone_times_shift    = zone_times_shift_pd.ix[:,0].values
last_zone_time      = zone_times_shift[-1]

#set parameters for cabbie cone
time_bin_minutes    = 10.
max_waiting_minutes = 2*time_bin_minutes
shift_end_zone_time = max(zone_times_shift)
avg_speed_mph       = 15

#set gas costs
miles_per_gallon    = 15.
dollars_per_gallon  = 3.
dollars_per_mile    = dollars_per_gallon / miles_per_gallon

def sample_next_zone_time(next_zone_time_choices, current_zone_time, policy, num_samples):
    '''Sample num_samples trips given current zonetime and distribution of possible next zonetimes
    determined from data.  Number of pickups is determined from pickup probability from data.
    If no pickup, return cost for move under policy [make_pickup, next_zone_time] and weight
    num_no_pickups = num_samples - num_pickups.'''
    #terminal zonetimes at end of shift
    if current_zone_time == last_zone_time:
        return [], [], current_zone_time, 0., 1 
    #determine number of pickup/no-pickup samples
    prob_pickup = prob_pickup_dict[current_zone_time]
    num_pickup_samples = sum(np.random.random(num_samples) < prob_pickup)*policy[0]
    num_no_pickup_samples = num_samples - num_pickup_samples
    #find next zonetime and rewards for num_no_pickup_samples 
    next_zone_time_no_pickup = policy[1]
    current_zone = zonetimes_to_zone_dict[current_zone_time]
    next_zone = zonetimes_to_zone_dict[next_zone_time_no_pickup]
    reward_no_pickup = -dollars_per_mile*euclid_dist_dict[(current_zone, next_zone)]
    #find next zonetime and rewards for num_pickup_samples 
    if num_pickup_samples == 0:
        next_zone_time_pickup_samples = []
        reward_pickup_samples = []
    else:
        #sample next zonetime and rewards assuming num_pickup_available_samples pickups are made
        next_zone_time_pickup_samples = list(np.random.choice(next_zone_time_choices, num_pickup_samples))
        zone_time_tuple_samples = zip([current_zone_time]*num_pickup_samples, next_zone_time_pickup_samples)
        reward_pickup_samples = [reward_dict[zone_time_tuple] - dollars_per_mile*dist_dict[zone_time_tuple]
                                 for zone_time_tuple in zone_time_tuple_samples]
    return next_zone_time_pickup_samples, reward_pickup_samples, next_zone_time_no_pickup, reward_no_pickup,\
           num_no_pickup_samples
           
@memoize.memoize(100000)
def get_causal_zone_times(current_zone_time):
    '''Return all zone_times after current zone time and within max_waiting_minutes 
    that can be reached assuming speed and Euclidean distance.'''
    current_zone = zonetimes_to_zone_dict[current_zone_time]
    current_time_bin = zonetimes_to_time_bin_dict[current_zone_time]
    
    min_zone_time = int((current_time_bin + 1)*num_zones)
    max_zone_time = min(int((current_time_bin + 2 + max_waiting_minutes/time_bin_minutes)*num_zones),
                        shift_end_zone_time)
    
    zone_times_within_max_waiting = np.arange(min_zone_time, max_zone_time)
    time_bins_within_max_waiting = np.floor(zone_times_within_max_waiting/num_zones)
    zone_times_within_max_waiting_euc_dist = np.array([euclid_dist_dict[(zonetimes_to_zone_dict[current_zone_time], 
                                                                         zonetimes_to_zone_dict[next_zone_time])]
                                                       for next_zone_time in zone_times_within_max_waiting])
    causal_zone_times = zone_times_within_max_waiting * \
                        (zone_times_within_max_waiting_euc_dist / avg_speed_mph * 60 <= 
                         (time_bins_within_max_waiting - current_time_bin)*time_bin_minutes)
    return causal_zone_times[np.nonzero(causal_zone_times)]
           
@memoize.memoize(100000)
def EstimateQ(root_width, width, action_width, depth, discount, current_zone_time):
    '''Return Q array containing [policy, expected reward, and expected value] for all policies.
    at current zone time. Width sets number of samples, and action_width sets number of actions 
    in cabbie cone to sample.'''
    #return empty Q array if at zero depth
    if depth == 0:
        return []
    #get zonetimes in cabbie cone
    causal_zone_times = get_causal_zone_times(current_zone_time)
    if len(causal_zone_times) == 0:
        return []
    #sample 2*action_width actions in cabbie cone
    causal_zone_times = np.random.choice(causal_zone_times, min(action_width, len(causal_zone_times)), replace=False)
    policies_iter = product([0, 1], causal_zone_times)
    num_policies = 2*len(causal_zone_times)
    #don't allow pickups to be skipped
    #policies_iter = product([1], causal_zone_times)
    #num_policies = len(causal_zone_times)
    
    Q_array = np.zeros((num_policies, 4))
    #if current zonetime in data, use data to determine possible dropoffs
    if current_zone_time in dropoff_dict.keys():
        next_zone_time_choices = dropoff_dict[current_zone_time]
    #else, use cabbie cone
    else:
        next_zone_time_choices = causal_zone_times
    #loop over all policies and calculate Q array from samples recursively
    policy_counter = 0
    for policy in policies_iter:
        pickup_samples, reward_pickup_samples, no_pickup_sample, reward_no_pickup,\
            num_no_pickup_samples = sample_next_zone_time(next_zone_time_choices, current_zone_time, policy, width)
        
        if len(pickup_samples) > 0:
            expected_reward = (sum(reward_pickup_samples) + num_no_pickup_samples*reward_no_pickup)/width
        else:
            expected_reward = reward_no_pickup
        Q_array[policy_counter] = np.array([policy[0], policy[1], expected_reward,
                                            expected_reward + \
                                            discount/width*sum([EstimateV(root_width, np.floor(discount**(2*(depth-1))*root_width),
                                                                          action_width, depth-1, discount, next_zone_time)
                                                                for next_zone_time in pickup_samples]) + \
                                            discount/width*num_no_pickup_samples*\
                                            EstimateV(root_width, np.floor(discount**(2*(depth-1))*root_width),
                                                      action_width, depth-1, discount, no_pickup_sample)])
        policy_counter += 1
    return Q_array
    
@memoize.memoize(100000)
def EstimateV(root_width, width, action_width, depth, discount, current_zone_time):
    Q_array = EstimateQ(root_width, width, action_width, depth, discount, current_zone_time)
    if len(Q_array) == 0:
        return 0.
    return max(Q_array[:,-1])

def get_prediction(current_zone_time, root_width=16, action_width=16, depth=2, discount=0.99):
    EQ = EstimateQ(root_width, root_width, action_width, depth, discount, current_zone_time)
    if EQ == []:
        print 'End of shift, go home!'
    else:
        argmax_a = EQ[np.argmax(EQ[:,-1], axis=0)]
        make_pickup = int(argmax_a[0])
        next_zone_time = int(argmax_a[1])
        expected_reward = argmax_a[2]
        if make_pickup:
            print 'Make pickup! Expected reward = {0:.2f}'.format(expected_reward)
        else:
            print 'Skip pickup! Go to zonetime {0}. Expected cost = {1: .2f}.'.format(next_zone_time, expected_reward)
            
def simulate_trip(current_zone_time, policy):
    causal_zone_times = get_causal_zone_times(current_zone_time)
    
    if len(causal_zone_times) == 0:
        return array([current_time_zone, 0., 0])
    
    if current_zone_time in dropoff_dict.keys():
        next_zone_time_choices = dropoff_dict[current_zone_time]
    else:
        next_zone_time_choices = [causal_zone_times[0]]
    
    pickup_samples, reward_pickup_samples, no_pickup_sample, reward_no_pickup, \
        num_no_pickup_samples = sample_next_zone_time(next_zone_time_choices, current_zone_time, policy, 1)
    
    if len(pickup_samples) == 1:
            return np.array([pickup_samples[0], reward_pickup_samples[0], 1])
    if policy[0] == 0:
        return np.array([policy[1], reward_no_pickup, -1]) #-1 = skip pickup
    return np.array([policy[1], reward_no_pickup, 0])
            
def simulate_shift(starting_zone_time, root_width=16, action_width=16, depth=2, discount=0.99, optimal=True, print_status=False):
    current_zone_time = starting_zone_time
    total_expected_reward = 0.
    pickup_counter = 0
    while True:
        if optimal:
            EQ = EstimateQ(root_width, root_width, action_width, depth, discount, current_zone_time)
            if len(EQ) == 0:
                break
            argmax_a = EQ[np.argmax(EQ[:,-1], axis=0)]
            best_policy = [int(argmax_a[0]), int(argmax_a[1])]
        else:
            causal_zone_times = get_causal_zone_times(current_zone_time)
            if len(causal_zone_times) == 0:
                break
#             best_policy = [random.randint(0, 2), np.random.choice(causal_zone_times)]
            best_policy = [1, np.random.choice(causal_zone_times)]

        simulated_trip = simulate_trip(current_zone_time, best_policy)
        current_zone_time = int(simulated_trip[0])
        expected_reward = simulated_trip[1]
        made_pickup = int(simulated_trip[2])
        total_expected_reward += expected_reward
        if made_pickup:
            pickup_counter += 1
        if print_status:
            if made_pickup == 1:
                print 'Make pickup: moving to {0:5d} = ({1:4d}, {2:3d}) and making {3:5.2f}'.format(current_zone_time,
                                                                                         zonetimes_to_zone_dict[current_zone_time],
                                                                                         zonetimes_to_time_bin_dict[current_zone_time],
                                                                                         expected_reward)
            if made_pickup == 0:
                print 'No   pickup: moving to {0:5d} = ({1:4d}, {2:3d}) and losing {3:5.2f}'.format(current_zone_time,
                                                                                         zonetimes_to_zone_dict[current_zone_time],
                                                                                         zonetimes_to_time_bin_dict[current_zone_time],
                                                                                         expected_reward)
            if made_pickup == -1:
                print 'Skip pickup: moving to {0:5d} = ({1:4d}, {2:3d}) and losing {3:5.2f}'.format(current_zone_time,
                                                                                         zonetimes_to_zone_dict[current_zone_time],
                                                                                         zonetimes_to_time_bin_dict[current_zone_time],
                                                                                         expected_reward)
    if print_status:
        print 'Pickups = {0:2d}'.format(pickup_counter)
        print 'Profit  = {0:0.2f}'.format(total_expected_reward)
    return total_expected_reward, pickup_counter
    
def zonetime_to_zone_time_bin(zonetime):
    return zonetimes_to_zone_dict[zonetime], zonetimes_to_time_bin_dict[zonetime]

def zone_time_bin_to_zonetime(zone, time_bin):
    return num_zones*time_bin + zone
    
#define lng/lat boundaries
center_lat = 40.75
center_lng = -73.925
dlat = 0.1
dlng = 0.1
min_lat = center_lat - dlat
max_lat = center_lat + dlat
min_lng = center_lng - dlng
max_lng = center_lng + dlng
num_lat_bins = 40
num_lng_bins = 40
lat_bin_size = 2*dlat/num_lat_bins
lng_bin_size = 2*dlng/num_lng_bins
lat_bins = np.linspace(min_lat, max_lat, num_lat_bins+1)
lng_bins = np.linspace(min_lng, max_lng, num_lng_bins+1)
    
def zone_to_lat_lng(zone):
    zone_lat_bin = np.floor(zone / num_lng_bins)
    zone_lng_bin = zone % num_lng_bins
    
    lngSW = min_lng + zone_lng_bin*2.*dlng/num_lng_bins #+ dlng/num_lng_bins
    latSW = min_lat + zone_lat_bin*2.*dlat/num_lat_bins #+ dlat/num_lat_bins
    return np.array([latSW, lngSW])
    
def lat_lng_to_zone(latlng):
    zone_lat_bin = np.digitize([latlng[0]], lat_bins) - 1
    zone_lng_bin = np.digitize([latlng[1]], lng_bins) - 1
    
    zone = zone_lat_bin * num_lng_bins + zone_lng_bin + 1
    return zone

#z, tb = zonetime_to_zone_time_bin(10914)
#print z
#print zonetimes_to_zone_dict[10914]
#latlng = zone_to_lat_lng(z)
#print latlng
#print lat_lng_to_zone(latlng)
#get_prediction(10914)
#simulate_shift(10914, depth=2, optimal=1, print_status=True)
