// Elite Respawn Timer Application
class EliteRespawnTimer {
    constructor() {
        this.elites = elites; // From elites.js
        this.timers = {};
        this.intervals = {};
        this.notificationSound = document.getElementById("notification-sound");
        this.notificationModal = document.getElementById("notification-modal");
        this.nextSpawnInfo = document.getElementById("next-spawn-info");
        this.eliteLogs = []; // Array para armazenar os logs
        this.missedSpawns = {}; // Objeto para armazenar spawns perdidos

        this.init();
    }

    init() {
        this.loadSavedData();
        this.populateEliteSelect();
        this.renderEliteCards();
        this.setupEventListeners();
        this.createParticles();
        this.startGlobalTimer();
        this.renderLogSection(); // Renderiza a seção de logs
    }

    // Load saved death times from localStorage
    loadSavedData() {
        const savedData = localStorage.getItem("eliteDeathTimes");
        if (savedData) {
            this.timers = JSON.parse(savedData);
        }
    }

    // Save death times to localStorage
    saveData() {
        localStorage.setItem("eliteDeathTimes", JSON.stringify(this.timers));
    }

addLog(eliteName, action) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = {
        eliteName,
        action,
        timestamp: now.getTime(),
        formattedTime
    };
    
    this.eliteLogs.unshift(logEntry);
    if (this.eliteLogs.length > 50) {
        this.eliteLogs.pop();
    }
    
    this.saveData();
    this.renderLogSection();
}
    
    // Populate the elite selection dropdown
    populateEliteSelect() {
        const select = document.getElementById("elite-select");
        this.elites.forEach((elite, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = `${elite.name} (${elite.location})`;
            select.appendChild(option);
        });
    }

    // Render all elite cards in a single grid
    renderEliteCards() {
        const allElitesGrid = document.getElementById("all-elites-grid");
        allElitesGrid.innerHTML = ""; // Clear existing cards

        this.elites.forEach((elite, index) => {
            const card = this.createEliteCard(elite, index);
            allElitesGrid.appendChild(card);
        });
    }

// Método para renderizar a seção de logs
    renderLogSection() {
        const logContainer = document.getElementById("elite-logs-container");
        if (!logContainer) return;

        logContainer.innerHTML = `
            <h3 class="section-title">
                <i class="fas fa-scroll"></i>
                Histórico de Elites
            </h3>
            <div class="log-actions">
                <button class="btn-small btn-clear-logs" onclick="eliteTimer.clearLogs()">
                    <i class="fas fa-trash"></i>
                    Limpar Histórico
                </button>
                <button class="btn-small btn-show-stats" onclick="eliteTimer.showMissedSpawnsStats()">
                    <i class="fas fa-chart-bar"></i>
                    Estatísticas
                </button>
            </div>
            <div class="logs-grid" id="elite-logs-grid"></div>
        `;

        const logsGrid = document.getElementById("elite-logs-grid");
        
        // Mostrar apenas os últimos 20 logs
        const recentLogs = this.eliteLogs.slice(0, 20);
        
        recentLogs.forEach(log => {
            const logElement = document.createElement("div");
            logElement.className = "log-entry";
            logElement.innerHTML = `
                <span class="log-time">[${log.formattedTime}]</span>
                <span class="log-elite">${log.eliteName}</span>
                <span class="log-action">${log.action}</span>
            `;
            logsGrid.appendChild(logElement);
        });

        if (recentLogs.length === 0) {
            logsGrid.innerHTML = '<div class="no-logs">Nenhum log disponível</div>';
        }
    }

clearLogs() {
        if (confirm("Tem certeza que deseja limpar todo o histórico?")) {
            this.eliteLogs = [];
            this.saveData();
            this.renderLogSection();
        }
    }

showMissedSpawnsStats() {
    const now = new Date();
    const statsData = {};
    
    // Calcular estatísticas para cada elite
    this.elites.forEach((elite, index) => {
        if (this.timers[index]) {
            const deathTime = new Date(this.timers[index]);
            const respawnTime = new Date(deathTime.getTime() + (elite.respawn * 60 * 1000));
            
            if (now > respawnTime) {
                // Calcular quantos spawns foram perdidos
                const timeSinceRespawn = now - respawnTime;
                const missedSpawns = Math.floor(timeSinceRespawn / (elite.respawn * 60 * 1000)) + 1;
                
                if (missedSpawns > 0) {
                    statsData[elite.name] = {
                        missedSpawns: missedSpawns,
                        lastRespawn: respawnTime,
                        nextRespawn: new Date(respawnTime.getTime() + (missedSpawns * elite.respawn * 60 * 1000)),
                        location: elite.location
                    };
                }
            }
        }
    });

    this.showStatsModal(statsData);
}

showStatsModal(statsData) {
    const modal = document.createElement("div");
    modal.className = "stats-modal";
    
    let statsContent = '<h3>Estatísticas de Spawns Perdidos</h3>';
    
    if (Object.keys(statsData).length === 0) {
        statsContent += '<p class="no-missed-spawns">Nenhum spawn perdido no momento!</p>';
    } else {
        statsContent += '<div class="stats-grid">';
        
        Object.entries(statsData).forEach(([eliteName, data]) => {
            const timeUntilNext = data.nextRespawn - new Date();
            const timeUntilNextFormatted = this.formatTimeLeft(timeUntilNext);
            
            statsContent += `
                <div class="stat-entry">
                    <div class="stat-elite">${eliteName}</div>
                    <div class="stat-location">${data.location}</div>
                    <div class="stat-missed">Spawns perdidos: <span class="missed-count">${data.missedSpawns}</span></div>
                    <div class="stat-next">Próximo em: <span class="next-time">${timeUntilNextFormatted}</span></div>
                </div>
            `;
        });
        
        statsContent += '</div>';
    }
    
    modal.innerHTML = `
        <div class="stats-content">
            ${statsContent}
            <div class="modal-buttons">
                <button class="btn-secondary" id="close-stats">
                    <i class="fas fa-times"></i>
                    Fechar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-stats').addEventListener('click', () => {
        modal.remove();
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

registerMissedSpawn(index, count, hour, minute) {
    const elite = this.elites[index];
    if (!elite) return;

    // Cria a data do último spawn perdido
    const now = new Date();
    const spawnTime = new Date();
    spawnTime.setHours(hour, minute, 0, 0);
    
    // Se o horário for no futuro, assume que foi ontem
    if (spawnTime > now) {
        spawnTime.setDate(spawnTime.getDate() - 1);
    }

    // Calcula o próximo spawn baseado no último perdido
    const nextSpawnTime = new Date(spawnTime.getTime() + (elite.respawn * 60 * 1000 * count));
    
    // Atualiza o timer
    this.timers[index] = nextSpawnTime.getTime();
    this.saveData();
    
    // Adiciona ao log
    this.addLog(elite.name, `Registrou ${count} spawn(s) perdido(s) às ${hour}:${minute.toString().padStart(2, '0')}`);
    
    // Atualiza a exibição
    this.updateEliteTimer(index);
}

setEliteDeathTimeNow(index) {
        this.timers[index] = new Date().getTime();
        this.saveData();
        this.updateEliteTimer(index);
        this.addLog(this.elites[index].name, "Definido tempo de morte agora");
    }


    // Create an elite card element
    createEliteCard(elite, index) {
        const card = document.createElement("div");
        card.className = "elite-card";
        card.id = `elite-${index}`;

        const respawnText = this.formatRespawnTime(elite.respawn);

        card.innerHTML = `
            <img src="${elite.image}" alt="${elite.name}" class="elite-image">
            <div class="elite-name">${elite.name}</div>
            <div class="elite-location">${elite.location}</div>
            <div class="elite-timer normal" id="timer-${index}">
                ${this.timers[index] ? "Calculando..." : `Respawn: ${respawnText}`}
            </div>
            <div class="elite-actions">
                <button class="btn-small btn-set-now" onclick="eliteTimer.setEliteDeathTimeNow(${index})">
                    <i class="fas fa-clock"></i>
                    Definir Morte Agora
                </button>
                <button class="btn-small btn-missed-spawn" onclick="eliteTimer.showMissedSpawnModal(${index})">
                    <i class="fas fa-history"></i>
                    Spawns Perdidos
                </button>
                <button class="btn-small btn-clear" onclick="eliteTimer.clearEliteTimer(${index})">
                    <i class="fas fa-times"></i>
                    Limpar
                </button>
            </div>
        `;

        return card;
    }

    // Format respawn time for display
    formatRespawnTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    }

    // Setup event listeners
    setupEventListeners() {
        const setDeathTimeBtn = document.getElementById("set-death-time");
        const clearAllBtn = document.getElementById("clear-all");
        const closeNotificationBtn = document.getElementById("close-notification");

        setDeathTimeBtn.addEventListener("click", () => this.setEliteDeathTimeManual());
        clearAllBtn.addEventListener("click", () => this.clearAllTimers());
        closeNotificationBtn.addEventListener("click", () => this.closeNotification());

        // Close notification when clicking outside
        this.notificationModal.addEventListener("click", (e) => {
            if (e.target === this.notificationModal) {
                this.closeNotification();
            }
        });
    }

    // Set death time for selected elite manually
    setEliteDeathTimeManual() {
        const eliteSelect = document.getElementById("elite-select");
        const hourInput = document.getElementById("death-hour");
        const minuteInput = document.getElementById("death-minute");
        const secondInput = document.getElementById("death-second");

        const eliteIndex = parseInt(eliteSelect.value);
        const hour = parseInt(hourInput.value) || 0;
        const minute = parseInt(minuteInput.value) || 0;
        const second = parseInt(secondInput.value) || 0;

        if (eliteIndex === "" || isNaN(eliteIndex)) {
            alert("Por favor, selecione um elite!");
            return;
        }

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
            alert("Por favor, insira um horário válido!");
            return;
        }

        // Create death time
        const now = new Date();
        const deathTime = new Date();
        deathTime.setHours(hour, minute, second, 0);

        // If the time is in the future today, assume it was yesterday
        if (deathTime > now) {
            deathTime.setDate(deathTime.getDate() - 1);
        }

        this.timers[eliteIndex] = deathTime.getTime();
        this.addLog(this.elites[eliteIndex].name, "Definido tempo de morte manual");
        this.updateEliteTimer(eliteIndex);
        this.saveData();

        // Clear inputs
        hourInput.value = "";
        minuteInput.value = "";
        secondInput.value = "";
        eliteSelect.value = "";

        // Update display
        this.updateEliteTimer(eliteIndex);
    }

    // Set death time for specific elite to now
    setEliteDeathTimeNow(index) {
        this.timers[index] = new Date().getTime();
        this.saveData();
        this.updateEliteTimer(index);
    }

    // Clear timer for specific elite
    clearEliteTimer(index) {
        if (this.timers[index]) {
            this.addLog(this.elites[index].name, "Temporizador limpo");
        }
        delete this.timers[index];
        this.saveData();
        this.updateEliteTimer(index);
    }

    // Clear all timers
    clearAllTimers() {
        if (confirm("Tem certeza que deseja limpar todos os temporizadores?")) {
            Object.keys(this.timers).forEach(index => {
                this.addLog(this.elites[index].name, "Temporizador limpo (todos)");
            });
            this.timers = {};
            this.saveData();
            this.renderEliteCards();
        }
    }

    // Update timer display for specific elite
    updateEliteTimer(index) {
        const elite = this.elites[index];
        const timerElement = document.getElementById(`timer-${index}`);
        const cardElement = document.getElementById(`elite-${index}`);

        if (!this.timers[index]) {
            timerElement.textContent = `Respawn: ${this.formatRespawnTime(elite.respawn)}`;
            timerElement.className = "elite-timer normal";
            cardElement.className = "elite-card";
            return;
        }

        const deathTime = new Date(this.timers[index]);
        const respawnTime = new Date(deathTime.getTime() + (elite.respawn * 60 * 1000));
        const now = new Date();

        if (now >= respawnTime) {
            timerElement.textContent = "DISPONÍVEL!";
            timerElement.className = "elite-timer ready";
            cardElement.className = "elite-card ready";
        } else {
            const timeLeft = respawnTime - now;
            const timeLeftFormatted = this.formatTimeLeft(timeLeft);

            timerElement.textContent = timeLeftFormatted;

            // Check if within 5 minutes of respawn
            if (timeLeft <= 5 * 60 * 1000) {
                timerElement.className = "elite-timer warning";
                cardElement.className = "elite-card warning";

                // Check for notification (only once per minute to avoid spam)
                const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
                if (minutesLeft === 5 && !this.notificationShown) {
                    this.showNotification(elite.name, minutesLeft);
                    this.notificationShown = true;
                    setTimeout(() => { this.notificationShown = false; }, 60000);
                }
            } else {
                timerElement.className = "elite-timer normal";
                cardElement.className = "elite-card";
            }
        }
    }

    loadSavedData() {
        const savedData = localStorage.getItem("eliteDeathTimes");
        if (savedData) {
            this.timers = JSON.parse(savedData);
        }

        const savedLogs = localStorage.getItem("eliteLogs");
        if (savedLogs) {
            this.eliteLogs = JSON.parse(savedLogs);
        }

        const savedMissedSpawns = localStorage.getItem("eliteMissedSpawns");
        if (savedMissedSpawns) {
            this.missedSpawns = JSON.parse(savedMissedSpawns);
        }
    }

 saveData() {
        localStorage.setItem("eliteDeathTimes", JSON.stringify(this.timers));
        localStorage.setItem("eliteLogs", JSON.stringify(this.eliteLogs));
        localStorage.setItem("eliteMissedSpawns", JSON.stringify(this.missedSpawns));
    }

showMissedSpawnModal(index) {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');

    const modal = document.createElement("div");
    modal.className = "missed-spawn-modal";
    modal.innerHTML = `
        <div class="missed-spawn-content">
            <h3>Registrar Spawn Perdido</h3>
            <p>${this.elites[index].name}</p>
            
            <div class="time-input-group">
                <label>Horário do último spawn perdido:</label>
                <div class="time-inputs">
                    <input type="number" id="missed-hour" min="0" max="23" value="${currentHour}" class="time-input">
                    <span>:</span>
                    <input type="number" id="missed-minute" min="0" max="59" value="${currentMinute}" class="time-input">
                </div>
            </div>
            
            <div class="time-input-group">
                <label>Quantos spawns perdidos?</label>
                <input type="number" id="missed-spawn-count" min="1" max="10" value="1" class="time-input">
            </div>
            
            <div class="modal-buttons">
                <button class="btn-primary" id="confirm-missed-spawn">
                    <i class="fas fa-check"></i>
                    Confirmar
                </button>
                <button class="btn-secondary" id="cancel-missed-spawn">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('confirm-missed-spawn').addEventListener('click', () => {
        const hour = parseInt(document.getElementById("missed-hour").value) || 0;
        const minute = parseInt(document.getElementById("missed-minute").value) || 0;
        const count = parseInt(document.getElementById("missed-spawn-count").value) || 1;
        
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            alert("Por favor, insira um horário válido!");
            return;
        }
        
        this.registerMissedSpawn(index, count, hour, minute);
        modal.remove();
    });
    
    document.getElementById('cancel-missed-spawn').addEventListener('click', () => {
        modal.remove();
    });
}

    // Format time left for display
    formatTimeLeft(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // Show notification
    showNotification(eliteName, minutesLeft) {
        const title = document.getElementById("notification-title");
        const message = document.getElementById("notification-message");

        title.textContent = "Elite Próximo!";
        message.textContent = `${eliteName} irá nascer em ${minutesLeft} minuto${minutesLeft > 1 ? "s" : ""}!`;

        this.notificationModal.classList.add("show");

        // Play notification sound
        this.playNotificationSound();

        // Auto-close after 10 seconds
        setTimeout(() => {
            this.closeNotification();
        }, 10000);
    }

    // Close notification
    closeNotification() {
        this.notificationModal.classList.remove("show");
    }

    // Play notification sound
    playNotificationSound() {
        // Try to play the audio file first
        if (this.notificationSound && this.notificationSound.readyState >= 2) {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(() => {
                // Fallback to Web Audio API if file doesn\'t work
                this.playWebAudioNotification();
            });
        } else {
            // Fallback to Web Audio API
            this.playWebAudioNotification();
        }

        // Also show browser notification if permission granted
        this.showBrowserNotification();
    }

    // Fallback Web Audio API notification
    playWebAudioNotification() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log("Audio notification not available");
        }
    }

    // Show browser notification
    showBrowserNotification() {
        if ("Notification" in window && Notification.permission === "granted") {
            const title = document.getElementById("notification-title").textContent;
            const message = document.getElementById("notification-message").textContent;

            new Notification(title, {
                body: message,
                icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNkNGFmMzciLz4KPHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxNiIgeT0iMTYiPgo8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IiMyYzE4MTAiLz4KPC9zdmc+Cjwvc3ZnPgo=",
                tag: "elite-respawn"
            });
        }
    }

    // Create floating particles
    createParticles() {
        const particlesContainer = document.getElementById("particles");
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement("div");
            particle.className = "particle";

            // Random position
            particle.style.left = Math.random() * 100 + "%";
            particle.style.animationDelay = Math.random() * 6 + "s";
            particle.style.animationDuration = (6 + Math.random() * 4) + "s";

            particlesContainer.appendChild(particle);
        }
    }

    // Start global timer to update all displays and find next spawn
    startGlobalTimer() {
        setInterval(() => {
            let nextSpawnTime = Infinity;
            let nextSpawnElite = null;

            Object.keys(this.timers).forEach(index => {
                this.updateEliteTimer(parseInt(index));

                const elite = this.elites[index];
                const deathTime = new Date(this.timers[index]);
                const respawnTime = new Date(deathTime.getTime() + (elite.respawn * 60 * 1000));
                const now = new Date();

                if (respawnTime > now && respawnTime.getTime() < nextSpawnTime) {
                    nextSpawnTime = respawnTime.getTime();
                    nextSpawnElite = elite;
                }
            });
            this.updateNextSpawnInfo(nextSpawnElite, nextSpawnTime);
        }, 1000);
    }

    // Update next spawn information display
    updateNextSpawnInfo(elite, respawnTime) {
        if (elite && respawnTime !== Infinity) {
            const now = new Date();
            const timeLeft = respawnTime - now.getTime();
            const timeLeftFormatted = this.formatTimeLeft(timeLeft);
            const predictedNextSpawn = new Date(respawnTime + (elite.respawn * 60 * 1000));

            this.nextSpawnInfo.innerHTML = `
                **${elite.name}** em **${timeLeftFormatted}**
                <br>Local: ${elite.location}
                <br>Próximo Respawn Previsto: ${predictedNextSpawn.toLocaleTimeString()}
            `;
            if (timeLeft <= 5 * 60 * 1000) {
                this.nextSpawnInfo.className = "next-spawn-info warning";
            } else {
                this.nextSpawnInfo.className = "next-spawn-info normal";
            }
        } else {
            this.nextSpawnInfo.textContent = "Nenhum elite definido.";
            this.nextSpawnInfo.className = "next-spawn-info normal";
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.eliteTimer = new EliteRespawnTimer();
});

// Request notification permission
if ("Notification" in window) {
    Notification.requestPermission();
}


