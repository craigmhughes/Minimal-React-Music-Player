import React, { Component } from 'react';
import settings from './src/settings.json';

const NodeID3 = require('node-id3');
const { remote } = require('electron');
const fs = require('fs');
const http = require('http');


class App extends Component {
    constructor() {
        super();

        this.state = {
            paused: true,
            music_dir: __dirname + "/src/",
            music_files: undefined,
            current_song: 0,
            current_info: {
                title: undefined,
                artist: undefined
            },
            origin_info: {
                title: undefined,
                artist: undefined
            },
            settings_open: false,
            favourites: [],
            is_hearted: false,
            tracks: []
        };

        this.readMusicFiles();
        // remote.BrowserWindow.getFocusedWindow().setAlwaysOnTop(true);

        // Call DOM effects in this method.
        if(this.state.music_files !== null) {
            this.checkWindow();
        }
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
            if(document.getElementById("songDuration") !== null) {
                let audio = document.getElementById("audio");
                let s = Math.floor(parseInt(audio.duration % 60));
                let m = Math.floor(parseInt((audio.duration / 60) % 60));
                document.getElementById("songDuration").innerText = s < 10 ? m + ':0' + s : m + ':' + s;
            }
        }, 1000);
    }

    // Read chosen Music Directory and push MP3 files to state array -- Do once.
    readMusicFiles(){
        let dir = settings.dir;

        if(settings.dir !== null){
            // Append and Prepend Slashes where needed.
            dir = settings.dir.charAt(settings.dir.length-1) !== "/" ? settings.dir + "/" : settings.dir;
            dir = dir.charAt(0) !== "/" && dir.charAt(0) !== "." ?
                "/" + dir : dir;

            if(!(fs.existsSync(dir))){
                this.state.music_dir = __dirname + '/src/music/';
            } else {
                this.state.music_dir = dir;
            }

        }

        let files = fs.readdirSync(this.state.music_dir);
        let musicfiles = [];

        for(let i = 0; i < files.length; i++){
            if(files[i].includes(".mp3")){
                musicfiles.push(files[i]);
            }
        }

        // Set music files to the read directory
        this.state.music_files = musicfiles;

        if(settings.current_song !== null){
            this.state.current_song = settings.current_song > this.state.music_files.length ? 0 : settings.current_song;
        }

        if(settings.favourites !== null) {
            this.state.favourites = settings.favourites;
        }

        if (this.state.music_files.length > 0)
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
                    },
                    origin_info: {
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
                    },
                    origin_info: {
                        title: details[1],
                        artist: details[0]
                    }
                });
            } else {
                this.setState({
                    current_info: {
                        title: songname.replace(".mp3",""),
                        artist: "Unknown Artist"
                    },
                    origin_info: {
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

                document.getElementById("albumArt").style.backgroundImage = `url(${datajpg})`;
                document.getElementById("albumArt").className = '';
            } else {
                document.getElementById("albumArt").style.backgroundImage = `url(${__dirname + "/src/imgs/null-album.png"})`;
                document.getElementById("albumArt").className = 'nullart';
            }
        });

        setTimeout(()=> {
            document.getElementById("albumArtist").innerText = this.state.origin_info.artist.length > 20 ? this.state.origin_info.artist.substr(0, 20) + "..." : this.state.origin_info.artist;
        },100);

        setTimeout(()=> {
            this.state.is_hearted = this.state.favourites.includes(this.state.current_song);
        },100);

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
        
        setTimeout(()=>{

            if(ford) {
                this.state.current_song += 1;
            } else {
                this.state.current_song -= 1;
            }

            let json = {
                dir: document.getElementById("directoryInput").value > 0 ? document.getElementById("directoryInput").value : settings.dir,
                current_song: this.state.current_song,
                favourites: this.state.favourites
            };

            // console.log(settings);

            fs.writeFile('./src/settings.json', JSON.stringify(json), (err) => {
                console.log(err);
            });

            this.readTrack();
            this.checkTitle();
            this.readAudioTime();
        }, 500);
    }

    checkTitle(){
        if(this.state.current_info.title !== undefined) {
            setTimeout(() => {
                this.state.current_info.title = this.state.current_info.title.length >= 25 ?
                    this.state.current_info.title.substring(0, 22) + "..." :
                    this.state.current_info.title;

                // console.log(this.state.current_info.title);
                this.forceUpdate();
            }, 1000);
        }
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

    getSettings(){
        this.state.settings_open = !this.state.settings_open;
        // console.log("here");
        // this.forceUpdate();

        if(this.state.settings_open){
            setTimeout(()=>{
                document.getElementById("settings").className = "open";
            }, 100);

        } else {
            setTimeout(()=>{
                document.getElementById("settings").className = "closed";
            }, 100);
        }
    }

    changeSettings(){

        // Directory Changes
        if(document.getElementById("directoryInput").value.length > 0) {
            this.state.music_dir = document.getElementById("directoryInput").value.charAt(document.getElementById("directoryInput").value.length) !== '/' ?
                document.getElementById("directoryInput").value + '/' : document.getElementById("directoryInput").value;

            this.state.music_dir = document.getElementById("directoryInput").value.charAt(0) !== '/' ? "/" + document.getElementById("directoryInput").value :
                document.getElementById("directoryInput").value;

            let json = {
                dir: document.getElementById("directoryInput").value,
                current_song: this.state.current_song,
                favourites: this.state.favourites
            };

            // console.log(settings);

            fs.writeFile('./src/settings.json', JSON.stringify(json), (err) => {
                console.log(err);
            });
        }

        if(document.getElementById("thumbInput").value.length > 0) {
            if(document.getElementById("thumbInput").value.includes("youtu.be")){

                // Get Usable Image string
                let stringLink = document.getElementById("thumbInput").value;
                stringLink = stringLink.substr(17,stringLink.length);

                // Music File
                let file = this.state.music_dir + this.state.music_files[this.state.current_song];

                let musicfile = fs.createWriteStream("./src/skull.jpg");
                // let request = http.get("http://img.youtube.com/vi/" + "k9AYOOYvbmM" + "/0.jpg", function(response) {
                //     response.pipe(musicfile);
                // });

                const request = require('request');

                let download = function(uri, filename, callback){
                    request.head(uri, function(err, res, body){
                        console.log('content-type:', res.headers['content-type']);
                        console.log('content-length:', res.headers['content-length']);

                        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
                    });
                };

                download("http://img.youtube.com/vi/" + stringLink + "/0.jpg", './src/music.jpg', function(){
                    console.log('done');
                });

                let tags = {
                    image: "./src/music.jpg"
                };

                // let success = NodeID3.write(tags, file); //  Returns true/false or, if buffer passed as file, the tagged buffer
                // console.log(success);
                setTimeout(()=> {
                    NodeID3.create(tags, function (frame) {
                    });
                    NodeID3.update(tags, file, function (err, buffer) {
                        console.log(err);
                    });

                    NodeID3.read(file, function (err, tags) {
                        console.log(tags);
                    });

                    // console.log(this.state.music_dir + this.state.music_files[this.state.current_song]);
                },1000);
            }
        }

        setTimeout(()=> {
        if(document.getElementById("thumbInput").value.length > 0 || document.getElementById("directoryInput").value.length > 0){
            remote.BrowserWindow.getFocusedWindow().reload();
        }},1500);

        this.forceUpdate();
        this.getSettings();
    }

    checkHeart(){
        if(this.state.favourites.includes(this.state.current_song)){
            delete this.state.favourites[this.state.favourites.indexOf(this.state.current_song)];
        } else {
            console.log("added heart");
            this.state.favourites.push(this.state.current_song);
        }

        let json = {
            dir: document.getElementById("directoryInput").value > 0 ? document.getElementById("directoryInput").value : settings.dir,
            current_song: this.state.current_song,
            favourites: this.state.favourites
        };

        fs.writeFile('./src/settings.json', JSON.stringify(json), (err) => {
            console.log(err);
        });


        // Force update via skipping forward and back
        this.skipTrack(true);
        this.skipTrack(false);
    }

    render(){

        return (
            <main className="App">
                <div id="settings" className={this.state.settings_open ? "open" : "closed"}>
                    <i className="fas fa-times" onClick={()=>{this.getSettings()}}>{}</i>
                    <h1>Settings</h1>

                    <div className="list-container">
                        <p>Paste your music directory here:</p>
                        <input type="text" id="directoryInput" placeholder={this.state.music_dir}/>
                    </div>
                    <div className="list-container">
                        <p>Paste your shortened YouTube link here to add album art</p>
                        <input type="text" id="thumbInput" placeholder="example: https://youtu.be/jDa2zmvp3ww"/>
                    </div>

                    <button id="settingsSubmit" onClick={()=>{this.changeSettings()}}>Done</button>
                </div>

                <div id="windowBar">
                    <i className="fas fa-window-minimize" onClick={()=>{remote.BrowserWindow.getFocusedWindow().minimize()}}>{}</i>
                    <i className="fas fa-cog" onClick={()=>{this.getSettings()}}>{}</i>
                    <i className="fas fa-times" onClick={()=>{remote.BrowserWindow.getFocusedWindow().close()}}>{}</i>
                </div>
                <section className="player">
                    <section className="poster">
                        <div className="overlay">
                            {this.state.current_info.title !== undefined ?
                            <div id="songInfo">
                                <div className="container">
                                    <p>NOW PLAYING</p>
                                    <h1 id="songTitle">
                                        {this.state.current_info.title}
                                        <i className={this.state.is_hearted ? "fas fa-heart" : "far fa-heart"} onClick={()=>{this.checkHeart()}}>{}</i>
                                        <br/>
                                        <span id="songArtist">{this.state.current_info.artist}</span>
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
                                : <div id="nullDirectory"><p>No Music Found</p></div>}

                            <div className="container" id="volumeSection">
                                <i className="fas fa-volume-up">{}</i>
                                <div id="volume-counterpart">
                                    <div id="vol-playtime"><div id="vol-played">{}</div></div>
                                    <input type="range" min="0" max="100" step="1" defaultValue="50" onChange={()=>{this.setVolume()}} id="volumeBar"/>
                                </div>
                            </div>
                        </div>
                        <div id="posterBG">{}</div>
                    </section>

                    <section className="controls">

                        <div className="container" style={{height: "100%", width: "100%"}}>
                            <div id="albumArt" style={{background: `url(${__dirname + "/src/imgs/null-album.png"})`}}>
                                <div id="albumOverlay" style={{background: `url(${__dirname + "/src/imgs/Diskoverlay.png"})`}}>
                                    <p id="albumArtist">Unkown</p>
                                </div>
                            </div>
                        </div>
                        <div className="container">
                            <i className={this.state.current_song > 0 ? "fa fa-chevron-left" : "fa fa-chevron-left limit"}
                               onClick={()=>{if (this.state.current_song > 0) {this.skipTrack(false)}}}>{}</i>

                            <i className={!this.state.paused ? "fas fa-pause" : "fas fa-play"}
                               onClick={()=>{this.togglePlay()}} id="play-button">{}</i>

                            <i className={this.state.current_song < this.state.music_files.length - 1? "fa fa-chevron-right" : "fa fa-chevron-right limit"}
                               onClick={()=>{if (this.state.current_song < this.state.music_files.length - 1) {this.skipTrack(true)}}}>{}</i>
                        </div>
                    </section>
                </section>
            </main>
        );
    }
}

export default App;