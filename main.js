document.getElementById('drop_zone').addEventListener('drop', dropHandler)
document.getElementById('drop_zone').addEventListener('dragover', dragOverHandler)
document.getElementById('drop_zone').addEventListener('dragleave', dragLeaveHandler)

let fileInputBtn = document.getElementById('select_file_btn'),
	startCensorBtn = document.getElementById('start_censor_btn'),
	getCensorWordContainer = document.getElementById('get_censor_word_container'),
	originalFileName = '';
fileInputBtn.addEventListener('change', function() {
	originalFileName = this.files[0].name;
	showCensorWordInput()
})

function dropHandler(e) {
	e.preventDefault();
	originalFileName = e.dataTransfer.files[0].name;
	showCensorWordInput()
}

startCensorBtn.addEventListener('click', e => {
	proccessRequest()
})
document.getElementById('get_censor_word').addEventListener('keyup', e => {
	if(e.key === 'Enter')
		proccessRequest()
})

function proccessRequest() {
	let censoredWord = document.getElementById('get_censor_word').value;
	if (censoredWord.trim() === '')
		alert('Please enter a word to censor')
	else {
		showPage('loader_page')
		sendFile(originalFileName, censoredWord)
	}
}

let frag = document.createDocumentFragment();
function createWord(word, status) {
	let card = document.createElement('div')
	card.classList.add('word-card')
	card.textContent = word;
	if (status)
		card.classList.add('censored')
	return card;
}

function renderWords(words) {
	document.getElementById('word_container').innerHTML = ''
	words.forEach(word => {
		frag.append(createWord(word.word, word?.censored))
	})
	document.getElementById('word_container').append(frag)
}

let allPages = document.querySelectorAll('.page')
function showPage(page) {
	allPages.forEach(page => {
		page.classList.add('hide')
	})
	document.getElementById(page).classList.remove('hide')
}

function dragOverHandler(ev) {
	this.classList.add('highlight')
	ev.preventDefault();
}
function dragLeaveHandler(ev) {
	this.classList.remove('highlight')
	ev.preventDefault();
}
function showCensorWordInput() {
	document.querySelectorAll('.hide-on-file-selected').forEach(el => {
		el.classList.add('hide')
	})
	getCensorWordContainer.classList.remove('hide')
	document.getElementById('selected_file_name').textContent = originalFileName
}
async function sendFile(fileName, word) {
	const response = await fetch('http://localhost:5000/api/', {
		method: 'post',
		body: JSON.stringify({ fileName: fileName, word: word })
	}),
	data = await response.json();
	const { fileName : file, words } = data;
	renderWords(words);
	document.getElementById("original_audio").setAttribute('src', 'audios/' + fileName);
	if (file) {
		document.getElementById("censored_audio").setAttribute('src', file);
	} else {
		document.getElementById("censored_audio_title").innerText = 'No Censored Audio';
		document.getElementById("censored_audio").setAttribute('src', 'audios/' + fileName);
	}
	showPage('result_page');
}


// web components

const smAudio = document.createElement('template')
smAudio.innerHTML = `
<style>
*{
    box-sizing: border-box;
    padding: 0;
    margin: 0;
}

:host{
	display: flex;
}

.audio{
  position: relative;
  display: -webkit-box;
  display: flex;
  -webkit-box-align: center;
          align-items: center;
  -webkit-user-select: none;
          user-select: none;
  padding: 0.6rem;
  border-radius: 0.2rem;
  background: rgba(var(--text), 0.08);
  overflow: hidden;
  width: 100%;
}

.hide {
  display: none;
}

.icon{
  stroke: rgba(var(--text), 1);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  overflow: visible;
  height: 2.1rem;
  width: 2.1rem;
  padding: 0.6rem;
  cursor: pointer;
  border-radius: 2rem;
  margin-right: 0.5rem;
}

.icon:hover{
  background: rgba(var(--text), 0.1);
}

audio {
  display: none;
}

.track {
  position: absolute;
  height: 0.2rem;
  bottom: 0;
  background: var(--primary-color);
  left: 0;
  -webkit-transition: width 0.2s;
  transition: width 0.2s;
  pointer-events: none;
  z-index: 0;
  border-radius: 0.2rem;
}

.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
	<div class="audio">
		<svg class="icon play" viewBox="-6 0 64 64">
			<title>play</title>
			<path d="M57.12,26.79,12.88,1.31a6,6,0,0,0-9,5.21v51a6,6,0,0,0,9,5.21L57.12,37.21A6,6,0,0,0,57.12,26.79Z"/>
		</svg>
		<svg class="icon pause hide" viewBox="0 0 64 64">
			<title>pause</title>
			<line x1="17.5" x2="17.5" y2="64"/>
			<line x1="46.5" x2="46.5" y2="64"/>
		</svg>
		<h5 class="current-time"></h5> / <h5 class="duration"></h5>
		<audio src=""></audio>
		<div class="track"></div>
	</audio>
`;

customElements.define('sm-audio', class extends HTMLElement{
	constructor() {
		super();
		this.attachShadow({mode: 'open'}).append(smAudio.content.cloneNode(true))

		this.playing = false;
	}
	static get observedAttributes() {
		return ['src']
	}
	play() {
		this.audio.play()
		this.playing = false;
		this.pauseBtn.classList.remove('hide')
		this.playBtn.classList.add('hide')
	}
	pause() {
		this.audio.pause()
		this.playing = true;
		this.pauseBtn.classList.add('hide')
		this.playBtn.classList.remove('hide')
	}

	get isPlaying() {
		return this.playing;
	}

	connectedCallback() {
		this.playBtn = this.shadowRoot.querySelector('.play');
		this.pauseBtn = this.shadowRoot.querySelector('.pause');
		this.audio = this.shadowRoot.querySelector('audio')
		this.playBtn.addEventListener('click', e => {
			this.play()
		})
		this.pauseBtn.addEventListener('click', e => {
			this.pause()
		})
		this.audio.addEventListener('ended', e => {
			this.pause()
		})
		let width;
		if ('ResizeObserver' in window) {
			let resizeObserver = new ResizeObserver(entries => {
				entries.forEach(entry => {
					width = entry.contentRect.width;
				})
			})
			resizeObserver.observe(this)
		}
		else {
			let observer = new IntersectionObserver((entries, observer) => {
				if (entries[0].isIntersecting)
					width = this.shadowRoot.querySelector('.audio').offsetWidth;
			}, {
				threshold: 1
			})
			observer.observe(this)
		}
		this.audio.addEventListener('timeupdate', e => {
			let time = this.audio.currentTime,
				minutes = Math.floor(time / 60),
				seconds = Math.floor(time - minutes * 60),
				y = seconds < 10 ? "0" + seconds : seconds;
			this.shadowRoot.querySelector('.current-time').textContent = `${minutes}:${y}`
			this.shadowRoot.querySelector('.track').style.width = (width / this.audio.duration) * this.audio.currentTime + 'px'
		})
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			if (name === 'src') {
				if (this.hasAttribute('src') && newValue.trim() !== '') {
					this.shadowRoot.querySelector('audio').src = newValue;
					this.shadowRoot.querySelector('audio').onloadedmetadata = () => {
						let duration = this.audio.duration,
							minutes = Math.floor(duration / 60),
							seconds = Math.floor(duration - minutes * 60),
							y = seconds < 10 ? "0" + seconds : seconds;
						this.shadowRoot.querySelector('.duration').textContent = `${minutes}:${y}`;
					}
				}
				else
					this.classList.add('disabled')
			}
		}
	}
})

