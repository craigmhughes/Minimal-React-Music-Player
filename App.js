import React, { Component } from 'react';

const NodeID3 = require('node-id3');
const { remote } = require('electron');
const fs = require('fs');


class App extends Component {
    constructor() {
        super();

        this.state = {
            paused: true,
            music_dir: __dirname + "/src/",
            music_files: undefined,
            current_song: 2,
            current_info: {
                title: undefined,
                artist: undefined
            }
        };

        this.readMusicFiles();
        // remote.BrowserWindow.getFocusedWindow().setAlwaysOnTop(true);

        // Call DOM effects in this method.
        this.checkWindow();
    }

    checkWindow(){
        window.addEventListener("load", ()=>{
            this.setVolume();
            this.checkTitle();

            let audio = document.getElementById("audio");
            audio.addEventListener("timeupdate", function() {
                let s = Math.floor(parseInt(audio.currentTime % 60));
                let m = Math.floor(parseInt((audio.currentTime / 60) % 60));

                document.getElementById("songTime").innerText = s < 10 ? m + ':0' + s : m + ':' + s;
            }, false);

            this.readAudioTime();

            // Re-render elms dependent on state results
            this.forceUpdate();
        });
    }

    readAudioTime(){
        setTimeout(()=>{
            let audio = document.getElementById("audio");
            let s = Math.floor(parseInt(audio.duration % 60));
            let m = Math.floor(parseInt((audio.duration / 60) % 60));
            document.getElementById("songDuration").innerText = s < 10 ? m + ':0' + s : m + ':' + s;
        }, 1000);
    }

    // Read chosen Music Directory and push MP3 files to state array -- Do once.
    readMusicFiles(){
        let files = fs.readdirSync(this.state.music_dir);
        let musicfiles = [];

        for(let i = 0; i < files.length; i++){
            if(files[i].includes(".mp3")){
                musicfiles.push(files[i]);
            }
        }

        // Set music files to the read directory
        this.state.music_files = musicfiles;
        this.readTrack();
    }

    readTrack(){
        let songname = this.state.music_files[this.state.current_song];
        let file = fs.readFileSync(this.state.music_dir + songname);

        Promise.resolve(NodeID3.read(file)).then((resp)=>{
            // console.log(resp);

            if(resp.artist !== undefined && resp.title !== undefined){
                this.setState({
                    current_info: {
                        title: resp.title,
                        artist: resp.artist
                    }
                });


            } else if(songname.includes("-")){
                // If file does not include tags, check if file is hyphenated.
                // This will normally include the details needed.

                let details = songname.replace(".mp3","").split(" - ");
                // Follow iTunes format -- Artist first, then song name.
                this.setState({
                    current_info: {
                        title: details[1],
                        artist: details[0]
                    }
                });
            } else {
                this.setState({
                    current_info: {
                        title: songname.replace(".mp3",""),
                        artist: "Unknown Artist"
                    }
                });
            }

            // Retrieve Album Art if exists
            if(resp.image !== undefined) {
                let getImageResult = resp.image;
                let b64encoded = btoa(String.fromCharCode.apply(null, getImageResult.imageBuffer));
                let datajpg = "data:image/jpg;base64," + b64encoded;

                document.getElementById("albumArt").src = datajpg;
                // document.getElementById("posterBG").style.backgroundImage = `url(${datajpg})`;
            } else {
                document.getElementById("albumArt").src = __dirname + "/src/imgs/null-album.png";
                document.getElementById("posterBG").style.backgroundImage = 'none';
            }
        });

        let audio = document.getElementById("audio");
        audio.src = this.state.music_dir + this.state.music_files[this.state.current_song];
        this.playAudio();
        this.readAudioTime();
    }


    playAudio(){
        // let audio = new Audio(this.state.music_dir + this.state.music_files[this.state.current_song]);
        let audio = document.getElementById("audio");

        if (!this.state.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    }

    togglePlay(){
        this.state.paused = !this.state.paused;
        document.getElementById("play-button").className = !this.state.paused ? "fas fa-pause" : "fas fa-play";
        this.playAudio();
        this.getTrackPoint();
    }

    // Skip track forward/back based on ford val.
    skipTrack(ford){
        if(ford) {
            this.state.current_song += 1;
        } else {
            this.state.current_song -= 1;
        }

        this.readTrack();
        this.checkTitle();
        this.readAudioTime();
    }

    checkTitle(){
        setTimeout(()=> {
            this.state.current_info.title = this.state.current_info.title.length >= 25 ?
                this.state.current_info.title.substring(0, 22) + "..." :
                this.state.current_info.title;

            console.log(this.state.current_info.title);
            this.forceUpdate();
        });
    }

    setTrackPoint(value){
        let audio = document.getElementById("audio");
        let percent = audio.duration / 100;

        audio.currentTime = percent * value;
    }

    setVolume(){
        let audio = document.getElementById("audio");
        audio.volume = document.getElementById("volumeBar").value / 100;

        document.getElementById("vol-played").style.width = document.getElementById("volumeBar").value + "%";
    }

    getTrackPoint(){
        if (!this.state.paused) {
            let audio = document.getElementById("audio");

            // Will refresh seekbar every second
            setInterval(() => {
                document.getElementById("seekBar").value = (audio.currentTime / audio.duration) * 100;
                document.getElementById("volumeBar").value = audio.volume * 100;

                if (audio.currentTime >= audio.duration) {
                    if(this.state.current_song === this.state.music_files.length - 1) {
                        this.state.paused = true;
                        document.getElementById("play-button").className = "fas fa-play";

                        clearInterval();
                    } else {
                        this.skipTrack(true);
                    }
                }
            }, 500);
        } else {
            clearInterval();
        }
    }

    render(){

        return (
            <main className="App">
                {/*<div id="windowBar">*/}
                    {/*<i className="fas fa-circle" onClick={()=>{remote.BrowserWindow.getFocusedWindow().close()}}>{}</i>*/}
                    {/*<i className="fas fa-window-minimize" onClick={()=>{remote.BrowserWindow.getFocusedWindow().minimize()}}>{}</i>*/}
                {/*</div>*/}
                <section className="player">
                    <section className="poster">
                        <div className="overlay">
                            <div className="container" style={{height: "100%", width: "100%"}}>
                                <img id="albumArt" src={__dirname + "/src/imgs/null-album.png"}/>
                            </div>
                            <div className="container" style={{paddingLeft: "20px"}}>
                                <h1 id="songTitle">{this.state.current_info.title}<br/><span id="songArtist">{this.state.current_info.artist}</span>
                                    </h1>

                                <div id="songSeek">
                                    <p id="songTime">0:00</p>
                                    <section className="seeker">
                                        <input type="range" min="0" max="100" step="1" defaultValue="0"
                                               onChange={()=>{this.setTrackPoint(document.getElementById("seekBar").value);}} id="seekBar">{}</input>
                                    </section>
                                    <p id="songDuration">0:00</p>
                                </div>
                            </div>
                        </div>
                        <div id="posterBG">{}</div>
                    </section>

                    <section className="controls">
                        <div className="container">
                            <i className={this.state.current_song > 0 ? "fa fa-chevron-left" : "fa fa-chevron-left limit"}
                               onClick={()=>{if (this.state.current_song > 0) {this.skipTrack(false)}}}>{}</i>

                            <i className={!this.state.paused ? "fas fa-pause" : "fas fa-play"}
                               onClick={()=>{this.togglePlay()}} id="play-button">{}</i>

                            <i className={this.state.current_song < this.state.music_files.length - 1? "fa fa-chevron-right" : "fa fa-chevron-right limit"}
                               onClick={()=>{if (this.state.current_song < this.state.music_files.length - 1) {this.skipTrack(true)}}}>{}</i>
                        </div>
                        <div className="container">
                            <div id="volume-counterpart">
                                <div id="vol-playtime"><div id="vol-played">{}</div></div>
                                <input type="range" min="0" max="100" step="1" defaultValue="50" onChange={()=>{this.setVolume()}} id="volumeBar"/>
                            </div>
                        </div>
                    </section>
                </section>
            </main>
        );
    }
}

export default App;