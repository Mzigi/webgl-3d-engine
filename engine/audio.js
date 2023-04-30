var audioCache = {}

function loadAudio(src) {
    if (!audioCache[src]) {
        let audio = new Audio(src)
        audio.addEventListener("canplaythrough", () => {
            audioCache[src] = audio
        })
        audio.load()
    }

    return audioCache[src]
}

class audioPlayer {
    constructor(url) {
        this.url = url
        this.playing = false

        this.audioElement = loadAudio(url)
    }

    loop(shouldLoop) {
        if (this.audioElement) {
            this.audioElement.loop = shouldLoop
        }
    }

    stop() {
        if (this.audioElement) {
            this.playing = false
            this.audioElement.stop()
        }
    }

    play() {
        if (this.audioElement && !this.playing) {
            this.playing = true
            this.audioElement.play()
        }
    }
}