const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow} = electron;

let mainWindow;

app.on('ready', function(){
    mainWindow = new BrowserWindow({
        resizable: false,
        frame: false,
        transparent: true,
        hasShadow: false
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "mainwindow.html"),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.setSize(500,310);
});

