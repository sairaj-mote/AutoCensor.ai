"""  ===> TO DO
-> $env:GOOGLE_APPLICATION_CREDENTIALS="autocensor.json"
-> & C:/Users/rituraj/AppData/Local/Programs/Python/Python37-32/python.exe c:/Users/rituraj/Documents/GitHub/AutoCensor.ai/main.py

        0 -> Receive Request

        1 -> Read the Audio File (Done)
            1.1-> If audio in .mp3 convert to .wav  (Done) (Saved in temp.py)
        2 -> Run it on speech to text API (Done)
        3 -> Check the Transcript for UnWanted Words (Done)
        4 -> Edit the Audio File (Done)

        5 -> Save the File (Done)
        6 -> Convert Output in a JSON

        Last -> Send Back Response

        More:-
            Speech Recognition Error Handling
 
"""

import wave
import json
from speech_recog import speech_recognition
from flask import Flask, request, jsonify

def make_dst(src):
    i = len(src) - 1
    while(i >= 0):
        if(src[i] == '.'):
            dot = i
        i -= 1
    
    dst = ""
    
    for i in  range(0,dot):
        dst += src[i]
    dst  = dst + "_edited.wav"
    return dst

def format_words(words, check_word):
    transcript = []
    for word in words:
        element = { 'word': word.word }
        if (word.word == check_word) :
            element['censored'] = True 
        transcript.append(element)
    return transcript

def beep(src, strt, end):
    dst = make_dst(src)
    
    beep = "audios/unit_beep.wav"
    b = wave.open(beep, 'r')
    
    #1 Read the Audio File
    a = wave.open(src, 'r')
    t = wave.open(dst, 'w')
    t.setparams(a.getparams())

    #4 Edit the Audio File
    st = int(strt * 44100)
    ed = int(end * 44100)

    t.writeframes(a.readframes(st))

    while(t.tell() <= ed):
        b.setpos(0)
        t.writeframes(b.readframes(10000))

    a.setpos(ed)
    t.writeframes(a.readframes(a.getnframes()-ed))

    #5 Save the Audio File
    b.close()
    t.close()
    a.close()
    return dst

def check_language(rslt, word):
    chk_list = { word }
    flg = 0
    word_list = rslt.results[0].alternatives[0].words
    len_word_list= len(word_list)
    n = None
    for  i in range(0,len_word_list):
        if word_list[i].word in chk_list:
            flg = 1
            n = i
            break
    
    if(flg != 1):
        st =  ed  =  None
    else:
        print(word_list[n])
        st = word_list[n].start_time.seconds + (word_list[n].start_time.nanos/1000000000)
        ed = word_list[n].end_time.seconds + (word_list[n].end_time.nanos/1000000000)
    return flg, st, ed


def compute(filename, word):
    rslt = speech_recognition(filename)
    flg , st, ed =  check_language(rslt, word)
    transcript = format_words(words = rslt.results[0].alternatives[0].words, check_word = word)
    if(flg==1):
        src = beep(filename, st, ed)
        return src, transcript
    print("No Censoring was done on the Audio")
    return False, transcript
    #Make rslt to json

app = Flask(__name__)
@app.route('/api/', methods=["POST"])
def main_interface():
    req = json.loads((request.get_data()).decode('utf-8'))
    print("---------------------------------------")
    filename = "audios/"+req['fileName']
    word = req['word']
    print("Log :\nFilename : " + filename)
    print("Word : " +  word)
    filename, words = compute(filename = filename, word = word)
    response = {'fileName':filename, 'words' : words }
    print(response)
    print("---------------------------------------")
    return jsonify(response)

@app.after_request
def add_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response
    
if __name__ == "__main__":
    app.run(debug=True)
    pass