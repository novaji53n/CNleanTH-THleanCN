let audioUnlocked = false;
        let sharedAudioCtx = null;
        let cachedVoices = [];

        function loadSpeechVoices() {
            if ('speechSynthesis' in window) {
                cachedVoices = window.speechSynthesis.getVoices() || [];
            }
        }

        if ('speechSynthesis' in window) {
            loadSpeechVoices();
            window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
        }

        function unlockMobileAudio() {
            try {
                if (!sharedAudioCtx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) sharedAudioCtx = new AudioCtx();
                }
                if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
                    sharedAudioCtx.resume();
                }
                audioUnlocked = true;
            } catch (e) {}
        }

        document.addEventListener('touchstart', unlockMobileAudio, { passive: true });
        document.addEventListener('click', unlockMobileAudio, { passive: true });

        function playSoundEffect(type) {
            try {
                unlockMobileAudio();
                if (!sharedAudioCtx) return;
                const osc = sharedAudioCtx.createOscillator();
                const gain = sharedAudioCtx.createGain();
                osc.connect(gain);
                gain.connect(sharedAudioCtx.destination);
                if (type === 'correct') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(587.33, sharedAudioCtx.currentTime);
                    osc.frequency.setValueAtTime(880, sharedAudioCtx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.15, sharedAudioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.3);
                    osc.start();
                    osc.stop(sharedAudioCtx.currentTime + 0.3);
                } else {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, sharedAudioCtx.currentTime);
                    osc.frequency.setValueAtTime(110, sharedAudioCtx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.15, sharedAudioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.35);
                    osc.start();
                    osc.stop(sharedAudioCtx.currentTime + 0.35);
                }
            } catch (e) {}
        }

        function pickVoiceForLang(langCode) {
            if (!cachedVoices || cachedVoices.length === 0) {
                loadSpeechVoices();
            }
            if (!cachedVoices || cachedVoices.length === 0) return null;

            const prefix = langCode.toLowerCase().slice(0, 2); // 'zh' หรือ 'th'
            return (
                cachedVoices.find(v => v.lang && v.lang.toLowerCase() === langCode.toLowerCase()) ||
                cachedVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
                null
            );
        }

        function playAudio(text, rate = 1.0) {
            unlockMobileAudio();
            if (!text) return;

            if (!('speechSynthesis' in window)) {
                alert(learningMode === 'th_to_cn' ? 'เบราว์เซอร์นี้ไม่รองรับระบบอ่านออกเสียง' : '此浏览器不支持语音朗读');
                return;
            }

            try {
                const targetLang = learningMode === 'th_to_cn' ? 'zh-CN' : 'th-TH';
                const matchedVoice = pickVoiceForLang(targetLang);

                // บนมือถือบางรุ่น การ cancel แล้ว speak ทันทีอาจทำให้เสียงเงียบ ให้หน่วงเล็กน้อยหรือ speak ตรง
                if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                    window.speechSynthesis.cancel();
                }

                const speakNow = () => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = targetLang;
                    utterance.rate = rate;
                    utterance.volume = 1.0;
                    if (matchedVoice) {
                        utterance.voice = matchedVoice;
                    }
                    utterance.onerror = () => {
                        playSoundEffect('incorrect');
                    };
                    window.speechSynthesis.speak(utterance);
                };

                if (isMobileViewActive) {
                    setTimeout(speakNow, 60);
                } else {
                    speakNow();
                }
            } catch (e) {
                playSoundEffect('incorrect');
            }
        }