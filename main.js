let synth;
const startButton = document.getElementById('startButton');
const tutorialControls = document.getElementById('tutorialControls');
const songSelect = document.getElementById('songSelect');
const playMusicButton = document.getElementById('playMusic');
const startTutorialButton = document.getElementById('startTutorial');
const songTitleElement = document.getElementById('songTitle');
const progressElement = document.getElementById('progress');
const pianoElement = document.getElementById('piano');
const sheetMusicElement = document.getElementById('sheetMusic');
const activeNotes = new Set();
let currentSong = null;
let currentNoteIndex = 0;
let isPlaying = false;

let notasPiano = [];
let songs = {};

fetch('musics.json')
    .then(response => response.json())
    .then(data => {
        notasPiano = data.notaspiano;
        songs = data.songs;
        createPiano();
        populateSongSelect();
    })
    .catch(error => console.error('Erro ao carregar musics.json:', error));

function createPiano() {
    notasPiano.forEach(note => {
        const key = document.createElement('div');
        key.className = `key ${note.includes('#') ? 'black' : ''}`;
        key.dataset.note = note;
        key.textContent = note;
        pianoElement.appendChild(key);
    });

    const keys = document.querySelectorAll('.key');
    initializePiano(keys);
}

function populateSongSelect() {
    songSelect.innerHTML = '<option value="">Selecione uma música</option>';
    for (const [key, song] of Object.entries(songs)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${song.title} (${song.difficulty})`;
        songSelect.appendChild(option);
    }
}

startButton.addEventListener('click', async () => {
    await Tone.start();
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    startButton.disabled = true;
    startButton.textContent = 'Piano Iniciado';
    tutorialControls.style.display = 'block';
});

startTutorialButton.addEventListener('click', () => {
    const selectedSong = songSelect.value;
    if (selectedSong) {
        startTutorial(selectedSong);
    }
});

function initializePiano(keys) {
    keys.forEach(key => {
        key.addEventListener('mousedown', (e) => handleStart(e, key));
        key.addEventListener('mouseup', () => handleEnd(key));
        key.addEventListener('mouseleave', () => handleEnd(key));

        key.addEventListener('touchstart', (e) => handleStart(e, key));
        key.addEventListener('touchend', () => handleEnd(key));
    });

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const key = document.querySelector(`.key[data-note="${getNoteFromKeyboard(e.key)}"]`);
        if (key) handleStart(e, key);
    });

    document.addEventListener('keyup', (e) => {
        const key = document.querySelector(`.key[data-note="${getNoteFromKeyboard(e.key)}"]`);
        if (key) handleEnd(key);
    });
}

function handleStart(e, key) {
    e.preventDefault();
    const note = key.dataset.note;
    if (!activeNotes.has(note)) {
        activeNotes.add(note);
        synth.triggerAttack(note);
        key.style.backgroundColor = key.classList.contains('black') ? '#333' : '#ddd';
        
        if (currentSong && note === currentSong.notes[currentNoteIndex]) {
            key.classList.add('correct');
            currentNoteIndex++;
            updateProgress();
            updateSheetMusic();
            if (currentNoteIndex >= currentSong.notes.length) {
                alert("Parabéns! Você completou a música!");
                resetTutorial();
            } else {
                highlightNextNote();
            }
        }
    }
}

function handleEnd(key) {
    const note = key.dataset.note;
    if (activeNotes.has(note)) {
        activeNotes.delete(note);
        synth.triggerRelease(note);
        key.style.backgroundColor = key.classList.contains('black') ? 'black' : 'white';
        key.classList.remove('correct');
    }
}

function getNoteFromKeyboard(key) {
    const keyboardMap = {
        'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4',
        't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
        'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5'
    };
    return keyboardMap[key.toLowerCase()];
}

function startTutorial(songKey) {
    currentSong = songs[songKey];
    currentNoteIndex = 0;
    songTitleElement.textContent = currentSong.title;
    updateProgress();
    updateSheetMusic();
    highlightNextNote();
    updateSongInfo();
}

function playMusic(songKey) {
    if (isPlaying) {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        isPlaying = false;
        playMusicButton.textContent = "Tocar música";
        removeAllHighlights();
        return;
    }

    const song = songs[songKey];
    const notes = song.sheet;
    let time = 0;

    isPlaying = true;
    playMusicButton.textContent = "Parar música";

    const part = new Tone.Part((time, note) => {
        synth.triggerAttackRelease(note.note, note.duration, time);
        highlightKey(note.note);
        setTimeout(() => removeHighlight(note.note), Tone.Time(note.duration).toMilliseconds());
    }, notes.map(note => {
        const noteTime = time;
        time += Tone.Time(note.duration).toSeconds();
        return [noteTime, note];
    }));

    part.start(0);
    Tone.Transport.start();

    part.onended = () => {
        isPlaying = false;
        playMusicButton.textContent = "Tocar música";
        removeAllHighlights();
    };
}

function highlightKey(note) {
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) {
        key.classList.add('playing');
    }
}

function removeHighlight(note) {
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) {
        key.classList.remove('playing');
    }
}

function removeAllHighlights() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => key.classList.remove('playing'));
}


// Adicione este event listener para o botão de tocar música
playMusicButton.addEventListener('click', () => {
    const selectedSong = songSelect.value;
    if (selectedSong) {
        playMusic(selectedSong);
    }
});

function highlightNextNote() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => key.classList.remove('highlight'));
    if (currentNoteIndex < currentSong.notes.length) {
        const nextNote = currentSong.notes[currentNoteIndex];
        const nextKey = document.querySelector(`.key[data-note="${nextNote}"]`);
        if (nextKey) {
            nextKey.classList.add('highlight');
        }
    }
}

function resetTutorial() {
    currentSong = null;
    currentNoteIndex = 0;
    songTitleElement.textContent = "";
    progressElement.textContent = "";
    sheetMusicElement.innerHTML = "";
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.classList.remove('highlight', 'correct');
    });
}

function updateProgress() {
    if (currentSong) {
        const progress = `${currentNoteIndex} / ${currentSong.notes.length}`;
        progressElement.textContent = `Progresso: ${progress}`;
    }
}

function updateSheetMusic() {
    if (currentSong && currentSong.sheet) {
        let sheetHTML = `
            <h3>Partitura</h3>
            <p>Tempo: ${currentSong.timeSignature}</p>
            <p>Tonalidade: ${currentSong.key}</p>
            <div class="sheet-container">
        `;

        currentSong.sheet.forEach((note, index) => {
            const isCurrentNote = index === currentNoteIndex;
            sheetHTML += `
                <div class="note ${isCurrentNote ? 'current-note' : ''}" data-index="${index}">
                    <div class="note-info">
                        <p class="note-name">${note.note}</p>
                        <p class="note-duration">${note.duration}</p>
                    </div>
                    <p class="note-lyrics">${note.lyrics}</p>
                </div>
            `;
        });

        sheetHTML += `
            </div>
            <div class="didactic-info">
                ${getDidacticInfo(currentSong.sheet[currentNoteIndex])}
            </div>
        `;

        sheetMusicElement.innerHTML = sheetHTML;

        // Adicionar event listeners para as notas na partitura
        document.querySelectorAll('.note').forEach(noteElement => {
            noteElement.addEventListener('click', () => {
                currentNoteIndex = parseInt(noteElement.dataset.index);
                updateSheetMusic();
                highlightNextNote();
            });
        });
    }
}

function getDidacticInfo(note) {
    let info = "Sabia que: ";
    switch (note.duration) {
        case "1/4":
            info += "Esta é uma semínima, que dura um tempo em um compasso 4/4.";
            break;
        case "1/2":
            info += "Esta é uma mínima, que dura dois tempos em um compasso 4/4.";
            break;
        case "1":
            info += "Esta é uma semibreve, que dura quatro tempos em um compasso 4/4.";
            break;
        default:
            info += "Cada nota tem uma duração que afeta o ritmo da música.";
    }
    return info;
}

function updateSongInfo() {
    if (currentSong) {
        const songInfoElement = document.getElementById('songInfo');
        songInfoElement.innerHTML = `
            <h3>${currentSong.title}</h3>
            <p>Dificuldade: ${currentSong.difficulty}</p>
            <p>Tags: ${currentSong.tags.join(', ')}</p>
        `;
    }
}

// Função para filtrar músicas por dificuldade
function filterSongsByDifficulty(difficulty) {
    const filteredSongs = Object.entries(songs).filter(([_, song]) => song.difficulty === difficulty);
    populateSongSelect(filteredSongs);
}

// Função para filtrar músicas por tag
function filterSongsByTag(tag) {
    const filteredSongs = Object.entries(songs).filter(([_, song]) => song.tags.includes(tag));
    populateSongSelect(filteredSongs);
}

// Atualizar a função populateSongSelect para aceitar músicas filtradas
function populateSongSelect(filteredSongs = null) {
    songSelect.innerHTML = '<option value="">Selecione uma música</option>';
    const songsToPopulate = filteredSongs || Object.entries(songs);
    for (const [key, song] of songsToPopulate) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${song.title} (${song.difficulty})`;
        songSelect.appendChild(option);
    }
}

// Adicionar event listeners para os filtros
document.getElementById('difficultyFilter').addEventListener('change', (e) => {
    const selectedDifficulty = e.target.value;
    if (selectedDifficulty) {
        filterSongsByDifficulty(selectedDifficulty);
    } else {
        populateSongSelect();
    }
});

document.getElementById('tagFilter').addEventListener('change', (e) => {
    const selectedTag = e.target.value;
    if (selectedTag) {
        filterSongsByTag(selectedTag);
    } else {
        populateSongSelect();
    }
});
