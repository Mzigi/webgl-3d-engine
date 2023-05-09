//input
var PressedKeys = {
    "w" : false,
    "a" : false,
    "s" : false,
    "d" : false,
    "ArrowUp": false,
    "ArrowRight": false,
    "ArrowDown": false,
    "ArrowLeft": false,
    " ": false,
    "Shift": false,
    "e": false,
    "c": false,
    "o": false,
    "n": false,
    "l": false,
}

var PressedKeysStart = {
    "w" : false,
    "a" : false,
    "s" : false,
    "d" : false,
    "ArrowUp": false,
    "ArrowRight": false,
    "ArrowDown": false,
    "ArrowLeft": false,
    " ": false,
    "Shift": false,
    "e": false,
}

document.body.onkeydown = function(e) {
    PressedKeys[e.key] = true
    PressedKeysStart[e.key] = true
}

document.body.onkeyup = function(e) {
    PressedKeys[e.key] = false
}

function isKeyPressed(keycode) {
    if (PressedKeys[keycode]) {
        return true
    } else {
        return false
    }
}

function keyPressStarted(keycode) {
    if (PressedKeysStart[keycode]) {
        return true
    } else {
        return false
    }
}

function resetInputs() {
    PressedKeysStart = {
        "w" : false,
        "a" : false,
        "s" : false,
        "d" : false,
        "ArrowUp": false,
        "ArrowRight": false,
        "ArrowDown": false,
        "ArrowLeft": false,
        " ": false,
        "Shift": false,
        "e": false,
    }
}