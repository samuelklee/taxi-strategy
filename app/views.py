from flask import render_template, request, jsonify
from app import app
import numpy as np
import pandas as pd

import markov

@app.route('/_set_start_zone')
def set_start_zone():
    start_zone_grid = request.args.get('startZoneState_py', -1, type=int) #40x40 zone name
    depth = request.args.get('treeDepth_py', 1, type=int)
    action_width = request.args.get('treeWidth_py', 16, type=int)
    start_zone = markov.zone_grid_to_zone_dict[start_zone_grid]
    start_zone_time = markov.zone_time_bin_to_zonetime(start_zone, markov.shift_beg_time_bin+1)
    make_pickup, next_zone, delta_time_bins, expected_reward, causal_zone_times = markov.get_prediction(start_zone_time, action_width=action_width, depth=depth)
    causal_zones = np.vectorize(markov.zonetime_to_zone_time_bin)(causal_zone_times)[0]
    return jsonify(makePickup=make_pickup, nextZone=next_zone, deltaTimeBins=delta_time_bins, expectedReward=expected_reward, causalZones=list(causal_zones))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')
