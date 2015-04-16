from flask import render_template, request, jsonify
from app import app
import numpy as np
import pandas as pd

#load dataframes
print 'Loading shit...'
reward_pd           = pd.read_pickle('app/static/data/mdp_files/reward_pd.pkl')
print 'reward_pd loaded'
dist_pd             = pd.read_pickle('app/static/data/mdp_files/dist_pd.pkl')
print 'dist_pd loaded'
euclid_dist_pd      = pd.read_pickle('app/static/data/mdp_files/euclid_dist_pd.pkl')
print 'euclid_dist_pd loaded'
dropoff_pd          = pd.read_pickle('app/static/data/mdp_files/dropoff_pd.pkl')
print 'dropoff_pd loaded'
prob_pickup_pd      = pd.read_pickle('app/static/data/mdp_files/prob_pickup_pd.pkl')
print 'prob_pickup_pd loaded'
zonetimes_pd        = pd.read_pickle('app/static/data/mdp_files/zonetimes_pd.pkl')
zone_times_shift_pd = pd.read_pickle('app/static/data/mdp_files/zone_times_shift_pd.pkl')
zone_matrix         = np.load('app/static/data/mdp_files/zone_matrix_40x40.dat')
print 'zone stuff loaded'
print 'Shit loaded!'

import markov

@app.route('/_set_start_zone')
def set_start_zone():
    start_zone = request.args.get('start_zone_state_py', -1, type=int)
    start_zone_time = markov.zone_time_bin_to_zonetime(start_zone, markov.shift_beg_time_bin)
    print start_zone, start_zone_time
    make_pickup, next_zone, delta_time_bins, expected_reward, causal_zone_times = markov.get_prediction(start_zone_time)
    causal_zones = np.vectorize(markov.zonetime_to_zone_time_bin)(causal_zone_times)[0]
    print causal_zones
    return jsonify(make_pickup=make_pickup, next_zone=next_zone, delta_time_bins=delta_time_bins, expected_reward=expected_reward, causal_zones=list(causal_zones))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')
