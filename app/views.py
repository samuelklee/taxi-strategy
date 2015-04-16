from flask import render_template, request
from app import app

#import static.dy.markov

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')
