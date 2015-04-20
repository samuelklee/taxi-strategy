from flask import render_template, request, jsonify
from app import app
import numpy as np
import pandas as pd

import markov

@app.route('/_predict')
def predict():
    start_zone_grid = request.args.get('currentZone_py', -1, type=int) #40x40 zone name
    current_time_bin = request.args.get('currentTimeBin_py', -1, type=int)
    depth = request.args.get('treeDepth_py', 1, type=int)
    action_width = request.args.get('treeWidth_py', 4, type=int)
    start_zone = markov.zone_grid_to_zone_dict[start_zone_grid]
    start_zone_time = markov.zone_time_bin_to_zonetime(start_zone, current_time_bin)
    make_pickup, next_zone, delta_time_bins, expected_reward, causal_zone_times = markov.get_prediction(start_zone_time, action_width=action_width, depth=depth)
    if len(causal_zone_times) == 0:
        return jsonify(makePickup=make_pickup, nextZone=-1, deltaTimeBins=delta_time_bins, expectedReward=expected_reward, causalZones=[])
    causal_zones = np.vectorize(markov.zonetime_to_zone_time_bin)(causal_zone_times)[0]
    return jsonify(makePickup=make_pickup, nextZone=next_zone, deltaTimeBins=delta_time_bins, expectedReward=expected_reward, causalZones=list(causal_zones))
    
@app.route('/_simulate_trip')
def simulate_trip():
    current_zone_grid = request.args.get('currentZone_py', -1, type=int) #40x40 zone name
    current_time_bin = request.args.get('currentTimeBin_py', -1, type=int)
    policy_make_pickup = request.args.get('policyMakePickup_py', -1, type=int)
    policy_zone = request.args.get('policyZone_py', -1, type=int)
    policy_time_bin = request.args.get('policyTimeBin_py', -1, type=int)
    current_zone = markov.zone_grid_to_zone_dict[current_zone_grid]
    current_zone_time = markov.zone_time_bin_to_zonetime(current_zone, current_time_bin)
    policy_zone_time = markov.zone_time_bin_to_zonetime(policy_zone, policy_time_bin)
    next_zone_time, expected_reward, made_pickup = markov.simulate_trip(current_zone_time, [policy_make_pickup, policy_zone_time])
    if next_zone_time == -1:
      return jsonify(nextZone=-1, nextTimeBin=next_time_bin, expectedReward=expected_reward, madePickup=made_pickup)
    next_zone, next_time_bin = markov.zonetime_to_zone_time_bin(next_zone_time)
    delta_time_bins = next_time_bin - current_time_bin
    causal_zone_times = markov.get_causal_zone_times(current_zone_time)
    if len(causal_zone_times) == 0:
        return jsonify(nextZone=next_zone, nextTimeBin=next_time_bin, deltaTimeBins=delta_time_bins, expectedReward=expected_reward, causalZones=[], madePickup=made_pickup)
    causal_zones = np.vectorize(markov.zonetime_to_zone_time_bin)(causal_zone_times)[0]
    return jsonify(nextZone=next_zone, nextTimeBin=next_time_bin, deltaTimeBins=delta_time_bins, expectedReward=expected_reward, madePickup=made_pickup, 
                   causalZones=list(causal_zones))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')
