document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const wheelModeBtn = document.getElementById('wheelModeBtn');
    const capsuleModeBtn = document.getElementById('capsuleModeBtn');
    const wheelMode = document.getElementById('wheelMode');
    const capsuleMode = document.getElementById('capsuleMode');
    const gachaButton = document.getElementById('gachaButton');
    const wheel = document.getElementById('wheel');
    const lever = document.getElementById('lever');
    const machineGlass = document.getElementById('machineGlass');
    const resultsList = document.getElementById('resultsList');
    const totalPullsElement = document.getElementById('totalPulls');
    const rarePullsElement = document.getElementById('rarePulls');
    const rateElement = document.getElementById('rate');

    // Data hadiah
    const prizes = [
        { id: 0, name: "ZONK", rarity: 0, icon: "❌", probability: 40 },
        { id: 1, name: "Limit 1", rarity: 1, icon: "🎮", probability: 25 },
        { id: 2, name: "Limit 2", rarity: 2, icon: "⚡", probability: 15 },
        { id: 3, name: "Limit 3", rarity: 3, icon: "🔥", probability: 10 },
        { id: 4, name: "Limit 4", rarity: 4, icon: "🌟", probability: 6 },
        { id: 5, name: "Limit 5", rarity: 5, icon: "💎", probability: 4 }
    ];

    // Statistik
    let totalPulls = 0;
    let rarePulls = 0;
    let results = [];

    // Inisialisasi wheel
    function initWheel() {
        wheel.innerHTML = '';
        const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
        let currentAngle = 0;
        
        prizes.forEach(prize => {
            const section = document.createElement('div');
            section.className = `wheel-section rarity-${prize.rarity}`;
            const angle = (prize.probability / totalProbability) * 360;
            
            section.style.transform = `rotate(${currentAngle}deg) skewY(${90 - angle}deg)`;
            section.style.background = getRarityColor(prize.rarity);
            
            const content = document.createElement('div');
            content.className = 'wheel-section-content';
            content.innerHTML = `<div>${prize.icon}</div><div style="font-size: 12px;">${prize.name}</div>`;
            
            section.appendChild(content);
            wheel.appendChild(section);
            
            currentAngle += angle;
        });
    }

    // Dapatkan warna berdasarkan rarity
    function getRarityColor(rarity) {
        const colors = [
            'var(--zonk)',    // ZONK
            'var(--limit1)',  // Limit 1
            'var(--limit2)',  // Limit 2
            'var(--limit3)',  // Limit 3
            'var(--limit4)',  // Limit 4
            'var(--limit5)'   // Limit 5
        ];
        return colors[rarity];
    }

    // Fungsi untuk menghasilkan hadiah berdasarkan probabilitas
    function getRandomPrize() {
        const random = Math.random() * 100;
        let cumulativeProbability = 0;

        for (const prize of prizes) {
            cumulativeProbability += prize.probability;
            if (random <= cumulativeProbability) {
                return prize;
            }
        }

        return prizes[0]; // Fallback ke ZONK
    }

    // Fungsi untuk menambahkan hasil ke riwayat
    function addResult(prize) {
        totalPulls++;
        if (prize.rarity >= 4) {
            rarePulls++;
        }
        
        results.unshift(prize);
        
        // Batasi riwayat hingga 10 item
        if (results.length > 10) {
            results.pop();
        }
        
        // Render ulang riwayat
        renderResults();
    }

    // Fungsi untuk merender ulang riwayat
    function renderResults() {
        resultsList.innerHTML = '';
        
        results.forEach((prize, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            if (index === 0) {
                resultItem.classList.add('highlight');
            }
            
            const rarityClass = prize.rarity === 0 ? 'zonk' : `limit-${prize.rarity}`;
            const rarityText = prize.rarity === 0 ? 'Coba lagi!' : '⭐'.repeat(prize.rarity);
            
            resultItem.innerHTML = `
                <div class="result-icon ${rarityClass}">${prize.icon}</div>
                <div class="result-details">
                    <div class="result-name">${prize.name}</div>
                    <div class="result-rarity">${rarityText}</div>
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
    }

    // Fungsi untuk memperbarui statistik
    function updateStats() {
        totalPullsElement.textContent = totalPulls;
        rarePullsElement.textContent = rarePulls;
        
        const rate = totalPulls > 0 ? ((rarePulls / totalPulls) * 100).toFixed(1) : 0;
        rateElement.textContent = `${rate}%`;
    }

    // Animasi Wheel
    function animateWheel(prize) {
        gachaButton.disabled = true;
        
        // Hitung putaran berdasarkan prize
        const prizeIndex = prizes.findIndex(p => p.id === prize.id);
        const sectionAngle = 360 / prizes.length;
        const targetAngle = 3600 + (prizeIndex * sectionAngle) - (sectionAngle / 2);
        
        // Putar wheel
        wheel.style.transform = `rotate(${targetAngle}deg)`;
        
        // Setelah animasi selesai
        setTimeout(() => {
            addResult(prize);
            updateStats();
            
            // Efek visual berdasarkan rarity
            if (prize.rarity >= 4) {
                createParticles(50, getRarityColor(prize.rarity));
                document.body.classList.add('shake');
                setTimeout(() => {
                    document.body.classList.remove('shake');
                }, 500);
            }
            
            gachaButton.disabled = false;
        }, 4000);
    }

    // Animasi Capsule
    function animateCapsule(prize) {
        gachaButton.disabled = true;
        lever.classList.add('pulled');
        
        // Buat kapsul
        const capsule = document.createElement('div');
        capsule.className = 'capsule';
        capsule.style.background = getRarityColor(prize.rarity);
        
        const capsuleTop = document.createElement('div');
        capsuleTop.className = 'capsule-top';
        capsuleTop.style.background = `linear-gradient(135deg, ${getRarityColor(prize.rarity)}, rgba(255,255,255,0.3))`;
        
        const capsuleBottom = document.createElement('div');
        capsuleBottom.className = 'capsule-bottom';
        capsuleBottom.style.background = getRarityColor(prize.rarity);
        capsuleBottom.textContent = prize.icon;
        
        capsule.appendChild(capsuleTop);
        capsule.appendChild(capsuleBottom);
        machineGlass.appendChild(capsule);
        
        // Animasi kapsul jatuh
        setTimeout(() => {
            capsule.style.top = '150px';
            
            setTimeout(() => {
                // Kapsul pecah
                capsule.style.transform = 'translateX(-50%) scale(1.2)';
                capsule.style.opacity = '0.7';
                
                // Tampilkan hadiah
                setTimeout(() => {
                    capsule.remove();
                    addResult(prize);
                    updateStats();
                    
                    // Efek visual berdasarkan rarity
                    if (prize.rarity >= 4) {
                        createParticles(30, getRarityColor(prize.rarity));
                        document.body.classList.add('bounce');
                        setTimeout(() => {
                            document.body.classList.remove('bounce');
                        }, 500);
                    }
                    
                    lever.classList.remove('pulled');
                    gachaButton.disabled = false;
                }, 500);
            }, 1000);
        }, 500);
    }

    // Buat efek partikel
    function createParticles(count, color) {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        document.querySelector('.gacha-section').appendChild(particlesContainer);
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.background = color;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.width = `${Math.random() * 10 + 5}px`;
            particle.style.height = particle.style.width;
            
            particlesContainer.appendChild(particle);
            
            // Animasi partikel
            const animation = particle.animate([
                { opacity: 0, transform: 'translate(0, 0) scale(1)' },
                { opacity: 1, transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(0)` }
            ], {
                duration: Math.random() * 1000 + 500,
                easing: 'ease-out'
            });
            
            animation.onfinish = () => {
                particle.remove();
            };
        }
        
        // Hapus container setelah semua partikel selesai
        setTimeout(() => {
            particlesContainer.remove();
        }, 1500);
    }

    // Event Listeners
    wheelModeBtn.addEventListener('click', function() {
        wheelModeBtn.classList.add('active');
        capsuleModeBtn.classList.remove('active');
        wheelMode.style.display = 'block';
        capsuleMode.style.display = 'none';
        gachaButton.textContent = 'Putar Wheel!';
    });

    capsuleModeBtn.addEventListener('click', function() {
        capsuleModeBtn.classList.add('active');
        wheelModeBtn.classList.remove('active');
        capsuleMode.style.display = 'block';
        wheelMode.style.display = 'none';
        gachaButton.textContent = 'Tarik Lever!';
    });

    gachaButton.addEventListener('click', function() {
        const prize = getRandomPrize();
        
        if (wheelMode.style.display !== 'none') {
            animateWheel(prize);
        } else {
            animateCapsule(prize);
        }
    });

    // Inisialisasi
    initWheel();
    renderResults();
    updateStats();
});
