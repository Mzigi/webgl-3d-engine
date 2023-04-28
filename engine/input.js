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
}

document.body.onkeydown = function(e) {
    PressedKeys[e.key] = true
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