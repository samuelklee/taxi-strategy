from flask import render_template, request, jsonify
from app import app
import numpy as np
import pandas as pd

import markov

@app.route('/_set_start_zone')
def set_start_zone():
    start_zone = request.args.get('start_zone_state_py', -1, type=int)
    start_zone_time = markov.zone_time_bin_to_zonetime(start_zone, markov.shift_beg_time_bin)
    make_pickup, next_zone, delta_time_bins, expected_reward, causal_zone_times = markov.get_prediction(start_zone_time)
    causal_zones = np.vectorize(markov.zonetime_to_zone_time_bin)(causal_zone_times)[0]
    return jsonify(make_pickup=make_pickup, next_zone=next_zone, delta_time_bins=delta_time_bins, expected_reward=expected_reward, causal_zones=list(causal_zones))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')
