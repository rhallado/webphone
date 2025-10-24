// Modern UI adaptation for ctxSip

var ctxSip;

$(document).ready(function() {

    // Check if credentials exist
    if (typeof(user) === 'undefined') {
        user = JSON.parse(localStorage.getItem('SIPCreds'));
    }

    // Setup Config Modal event handlers (needed even without credentials)
    $('#btnConfig').click(function() {
        // Load current config
        var creds = JSON.parse(localStorage.getItem('SIPCreds'));
        if (creds) {
            $('#cfgDisplay').val(creds.Display);
            $('#cfgUser').val(creds.User);
            $('#cfgPassword').val(creds.Pass);
            $('#cfgRealm').val(creds.Realm);
            $('#cfgWSServer').val(creds.WSServer);
        }
        $('#config-modal').addClass('active');
    });

    $('#closeConfig').click(function() {
        $('#config-modal').removeClass('active');
    });

    $('#btnSaveConfig').click(function() {
        var config = {
            Display: $('#cfgDisplay').val(),
            User: $('#cfgUser').val(),
            Pass: $('#cfgPassword').val(),
            Realm: $('#cfgRealm').val(),
            WSServer: $('#cfgWSServer').val()
        };
        
        localStorage.setItem('SIPCreds', JSON.stringify(config));
        alert('Configurações salvas! Recarregando...');
        location.reload();
    });

    // Setup call control buttons (needed for incoming calls even without active session)
    // Use event delegation for call control buttons to ensure they are always active
    $(document).on("click", "#btnAnswer", function() {
        if (ctxSip && ctxSip.sipAnswer && ctxSip.callActiveID) {
            ctxSip.sipAnswer(ctxSip.callActiveID);
        }
    });

    $(document).on("click", "#btnHangup", function() {
        if (ctxSip && ctxSip.sipHangUp && ctxSip.callActiveID) {
            ctxSip.sipHangUp(ctxSip.callActiveID);
        }
    });

    // If no credentials, show config modal and stop SIP initialization
    if (!user || !user.Pass || !user.User || !user.Realm || !user.WSServer) {
        $('#config-modal').addClass('active');
        $('#txtRegStatus').html('Por favor, configure suas credenciais SIP');
        return;
    }

    ctxSip = {

        config : {
            password        : user.Pass,
            displayName     : user.Display,
            uri             : 'sip:'+user.User+'@'+user.Realm,
            wsServers       : user.WSServer,
            registerExpires : 30,
            traceSip        : true,
            log             : {
                level : 0,
            }
        },
        ringtone     : document.getElementById('ringtone'),
        ringbacktone : document.getElementById('ringbacktone'),
        dtmfTone     : document.getElementById('dtmfTone'),

        Sessions     : [],
        callTimers   : {},
        callActiveID : null,
        callVolume   : 1,
        Stream       : null,

        /**
         * Parses a SIP uri and returns a formatted phone number.
         */
        formatPhone : function(phone) {
            var num;

            if (phone.indexOf('@')) {
                num =  phone.split('@')[0];
            } else {
                num = phone;
            }

            num = num.toString().replace(/[^0-9]/g, '');

            if (num.length === 10) {
                return '(' + num.substr(0, 3) + ') ' + num.substr(3, 3) + '-' + num.substr(6,4);
            } else if (num.length === 11) {
                return '(' + num.substr(1, 3) + ') ' + num.substr(4, 3) + '-' + num.substr(7,4);
            } else {
                return num;
            }
        },

        // Sound methods
        startRingTone : function() {
            try { ctxSip.ringtone.play(); } catch (e) { }
        },

        stopRingTone : function() {
            try { ctxSip.ringtone.pause(); } catch (e) { }
        },

        startRingbackTone : function() {
            try { ctxSip.ringbacktone.play(); } catch (e) { }
        },

        stopRingbackTone : function() {
            try { ctxSip.ringbacktone.pause(); } catch (e) { }
        },

        // Generates a random string to ID a call
        getUniqueID : function() {
            return Math.random().toString(36).substr(2, 9);
        },

        // UI State Management
        showSplashScreen : function() {
            
            $('#sip-splash').addClass('active');
            $('#sip-active-call').removeClass('active');
        },

        showActiveCallScreen : function() {
            
            $('#sip-splash').removeClass('active');
            $('#sip-active-call').addClass('active');
        },

        updateCallTimer : function() {
            var timer = ctxSip.callTimers[ctxSip.callActiveID];
            if (timer) {
                var elapsed = Date.now() - timer.startTime;
                var hours = Math.floor(elapsed / 3600000);
                var minutes = Math.floor((elapsed % 3600000) / 60000);
                var seconds = Math.floor((elapsed % 60000) / 1000);
                
                $('#callTimer').text(
                    String(hours).padStart(2, '0') + ':' +
                    String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0')
                );
            }
        },

        newSession : function(newSess) {
            console.log("newSession called for direction: " + newSess.direction);

            newSess.displayName = newSess.remoteIdentity.displayName || newSess.remoteIdentity.uri.user;
            newSess.ctxid       = ctxSip.getUniqueID();

            var status;

            // Update UI for incoming/outgoing call
            ctxSip.showActiveCallScreen();

            // Set the active call ID immediately when a new session is created
            ctxSip.callActiveID = newSess.ctxid;

            if (newSess.direction === 'incoming') {
                status = "Recebendo: "+ newSess.displayName;
                ctxSip.startRingTone();
                // For incoming calls, show answer and hangup buttons
                $('#btnAnswer').show();
                $('#btnHangup').show();
            } else {
                status = "Tentando: "+ newSess.displayName;
                ctxSip.startRingbackTone();
                // For outgoing calls, ensure answer button is hidden, show only hangup button
                $('#btnAnswer').hide();
                $('#btnHangup').show();
            }

            ctxSip.logCall(newSess, "ringing");
            ctxSip.setCallSessionStatus(status);

            // Update UI for incoming/outgoing call
            ctxSip.showActiveCallScreen();
            $('#activeCallName').text(newSess.displayName);
            $('#activeCallNumber').text(ctxSip.formatPhone(newSess.remoteIdentity.uri.user));
            $('#callTimer').text('00:00:00');

            // Configurar captura de áudio remoto usando polling
            var audioCheckInterval = setInterval(function() {
                try {
                    if (newSess.sessionDescriptionHandler && newSess.sessionDescriptionHandler.peerConnection) {
                        var pc = newSess.sessionDescriptionHandler.peerConnection;
                        var remoteStreams = pc.getRemoteStreams();
                        
                        if (remoteStreams && remoteStreams.length > 0) {
                            var remoteAudio = document.getElementById('audioRemote');
                            remoteAudio.srcObject = remoteStreams[0];
                            remoteAudio.play().catch(function(e) {
                                console.error('Erro ao reproduzir áudio remoto:', e);
                            });
                            ctxSip.Stream = remoteAudio;
                            console.log('Áudio remoto anexado com sucesso via polling!');
                            clearInterval(audioCheckInterval); // Para o polling após sucesso
                        }
                    }
                } catch (e) {
                    console.error('Erro ao verificar stream remoto:', e);
                }
            }, 100); // Verifica a cada 100ms
            
            // Limpar o intervalo após 10 segundos para evitar vazamento de memória
            setTimeout(function() {
                clearInterval(audioCheckInterval);
            }, 10000);

            // EVENT CALLBACKS

            newSess.on('progress',function(e) {
                if (e.direction === 'outgoing') {
                    ctxSip.setCallSessionStatus('Chamando...');
                }
            });

            newSess.on('connecting',function(e) {
                if (e.direction === 'outgoing') {
                    ctxSip.setCallSessionStatus('Conectando...');
                }
            });

            newSess.on('accepted',function(e) {
                console.log("Call Accepted event fired.");
                // If there is another active call, hold it
                if (ctxSip.callActiveID && ctxSip.callActiveID !== newSess.ctxid) {
                    ctxSip.phoneHoldButtonPressed(ctxSip.callActiveID);
                }

                ctxSip.stopRingbackTone();
                ctxSip.stopRingTone();
                ctxSip.setCallSessionStatus('Conectado');
                ctxSip.logCall(newSess, 'answered');
                ctxSip.callActiveID = newSess.ctxid; // Ensure callActiveID is set upon acceptance
                
                // Once call is accepted, hide answer button (if it was an incoming call)
                $('#btnAnswer').hide();
                // Ensure hangup button is visible for active call
                $('#btnHangup').show();

                // Start call timer
                ctxSip.callTimers[newSess.ctxid] = {
                    startTime: Date.now(),
                    interval: setInterval(ctxSip.updateCallTimer, 1000)
                };
            });

            newSess.on('hold', function(e) {
                ctxSip.callActiveID = null;
                ctxSip.logCall(newSess, 'holding');
                ctxSip.setCallSessionStatus('Em Espera');
                $('#btnHold').addClass('active');
            });

            newSess.on('unhold', function(e) {
                ctxSip.logCall(newSess, 'resumed');
                ctxSip.callActiveID = newSess.ctxid;
                ctxSip.setCallSessionStatus('Conectado');
                $('#btnHold').removeClass('active');
            });

            newSess.on('muted', function(e) {
                ctxSip.Sessions[newSess.ctxid].isMuted = true;
                ctxSip.setCallSessionStatus("Silenciado");
                $('#btnMute').addClass('active');
                $('#btnMute i').removeClass('fa-microphone').addClass('fa-microphone-slash');
            });

            newSess.on('unmuted', function(e) {
                ctxSip.Sessions[newSess.ctxid].isMuted = false;
                ctxSip.setCallSessionStatus("Connected");
                $('#btnMute').removeClass('active');
                $('#btnMute i').removeClass('fa-microphone-slash').addClass('fa-microphone');
            });

            newSess.on('cancel', function(e) {
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus("Cancelada");
                ctxSip.callActiveID = null; // Clear active ID on cancel
                newSess             = null;
                ctxSip.logCall(this, 'ended');
                ctxSip.endCall();
            });

            newSess.on('bye', function(e) {
                console.log("Call Bye event fired.");
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus("Desligado");
                ctxSip.callActiveID = null; // Clear active ID on bye
                newSess             = null;
                ctxSip.logCall(this, 'ended');
                ctxSip.endCall();
            });

            newSess.on('failed',function(e) {
                console.log("Call Failed event fired.");
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus('Falhou');
                ctxSip.endCall();
            });

            newSess.on('rejected',function(e) {
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus('Rejeitado');
                ctxSip.endCall();
            });

            ctxSip.Sessions[newSess.ctxid] = newSess;
        },

        /**
         * Toggles the display of the numeric keypad.
         */
        phoneKeypadPressed : function(digit) {
            $('#numDisplay').val($('#numDisplay').val() + digit);
            try { ctxSip.dtmfTone.play(); } catch(e) { }
        },

        phoneCallButtonPressed : function() {
            
            var num = $('#numDisplay').val();

            if (!num) { 
                $('#numDisplay').focus();
                return;
            }
            
            // Strip all non-numeric characters from the number
            num = num.replace(/[^0-9*#]/g, '');

            if (num.length > 0) {
                // Lógica de chamada existente
                
                var session = ctxSip.phone.invite(num, {
                    sessionDescriptionHandlerOptions: {
                        constraints: {
                            audio: true,
                            video: false
                        },
                        render: {
                            remote: document.getElementById('audioRemote')
                        },
                        RTCConstraints: {
                            "optional": [ {'DtlsSrtpKeyAgreement': 'true'} ]
                        }
                    }
                });
                // Chamada explícita para newSession para garantir a atualização da UI para chamadas de saída
                ctxSip.newSession(session);
            }
        },

        sipHangUp : function(id) {
            var sess = ctxSip.Sessions[id];
            if (!sess) {
                return;
            }
            if (sess.startTime) {
                sess.bye();
            } else {
                sess.cancel();
            }
        },

        sipAnswer : function(id) {
            var sess = ctxSip.Sessions[id];
            if (sess) {
                sess.accept({
                    sessionDescriptionHandlerOptions: {
                        constraints: {
                            audio: true,
                            video: false
                        },
                        render: {
                            remote: { audio: document.getElementById('audioRemote') }
                        },
                        RTCConstraints: {
                            optional: [ { 'DtlsSrtpKeyAgreement': 'true' } ]
                        }
                    }
                });
            }
        },

        setCallSessionStatus : function(status) {
            $('#txtCallStatus').html(status);
        },

        // DTMFS
        phoneDTMFButtonPressed : function(tone) {
            var sess = ctxSip.Sessions[ctxSip.callActiveID];
            if (sess && tone) {
                try {
                    sess.dtmf(tone);
                    ctxSip.dtmfTone.play();
                } catch(e) {
                    console.error('Failed to send DTMF', e);
                }
            }
        },

        // HOLD
        phoneHoldButtonPressed : function(id) {
            var sess = ctxSip.Sessions[id];
            if (sess.isOnHold().local) {
                sess.unhold();
            } else {
                sess.hold();
            }
        },

        // MUTE
        phoneMuteButtonPressed : function(id) {
            var sess = ctxSip.Sessions[id];
            if (sess.isMuted) {
                sess.unmute();
            } else {
                sess.mute();
            }
        },

        // Call Log
        logCall : function(session, status) {
            var log = {
                id: session.ctxid,
                name: session.displayName,
                uri: session.remoteIdentity.uri.toString(),
                start: new Date(),
                flow: session.direction,
                status: status
            };

            localStorage.setItem(log.id, JSON.stringify(log));
            ctxSip.logShow();
        },

        logShow : function() {
            var html = '';
            for (var i = 0; i < localStorage.length; i++){
                var key = localStorage.key(i);
                if (key.substring(0,4) === 'sip-') {
                    var data = JSON.parse(localStorage.getItem(key));
                    var callDay = moment(data.start).format('DD/MM/YYYY');
                    var callTime = moment(data.start).format('HH:mm');
                    var icon = data.flow === 'incoming' ? 'fa-arrow-down' : 'fa-arrow-up';
                    html += `<div class="history-item">
                                <div class="history-icon ${data.flow}"><i class="fas ${icon}"></i></div>
                                <div class="history-details">
                                    <div class="history-name">${data.name}</div>
                                    <div class="history-number">${ctxSip.formatPhone(data.uri)}</div>
                                </div>
                                <div class="history-time">${callDay} ${callTime}</div>
                             </div>`;
                }
            }
            $('#sip-logitems').html(html || '<p class="empty-state">Nenhuma chamada recente.</p>');
        },

        endCall : function() {
            ctxSip.stopRingTone();
            ctxSip.stopRingbackTone();
            if (ctxSip.callActiveID) {
                var timer = ctxSip.callTimers[ctxSip.callActiveID];
                if (timer) {
                    clearInterval(timer.interval);
                    delete ctxSip.callTimers[ctxSip.callActiveID];
                }
            }
            ctxSip.callActiveID = null;
            ctxSip.showSplashScreen();
        },

        // Inicia o UA
        init : function() {
            try {
                ctxSip.phone = new SIP.UA(ctxSip.config);

                ctxSip.phone.on('registered', function(e) {
                    var closeEditorWarning = function() {
                        return 'Tem certeza que deseja fechar a aba? Uma chamada ativa pode ser desconectada.';
                    };
                    window.onbeforeunload = closeEditorWarning;
                    $('#txtRegStatus').html('Registrado');
                    $('#statusIndicator').addClass('online');
                });

                ctxSip.phone.on('unregistered', function(e) {
                    $('#txtRegStatus').html('Não Registrado');
                    $('#statusIndicator').removeClass('online');
                    if (e.cause === SIP.C.causes.NETWORK_ERROR) {
                        // Handle network error, maybe retry registration
                    }
                });

                ctxSip.phone.on('registrationFailed', function(e) {
                    $('#txtRegStatus').html('Falha no Registro');
                    $('#statusIndicator').removeClass('online');
                });

                ctxSip.phone.on('invite', ctxSip.newSession);

            } catch(e) {
                console.error('Falha ao inicializar o SIP.UA', e);
            }
        }
    };

    // Inicia o ctxSip
    ctxSip.init();

    // UI Event Handlers
    $('.num-btn').click(function() {
        ctxSip.phoneKeypadPressed($(this).data('num'));
    });

    $('#btnCall').click(function() {
        ctxSip.phoneCallButtonPressed();
    });

    $('#btnHistory').click(function() {
        $('#history-modal').addClass('active');
        ctxSip.logShow();
    });

    $('#closeHistory').click(function() {
        $('#history-modal').removeClass('active');
    });

    $('#clearHistory').click(function() {
        for (var i = 0; i < localStorage.length; i++){
            if (localStorage.key(i).substring(0,4) === 'sip-') {
                localStorage.removeItem(localStorage.key(i));
            }
        }
        ctxSip.logShow();
    });

    $('#btnVolume').click(function() {
        $('#volume-modal').addClass('active');
    });

    $('#closeVolume').click(function() {
        $('#volume-modal').removeClass('active');
    });

    $('#sldVolume').on('input', function() {
        ctxSip.callVolume = $(this).val() / 100;
        $('#volumeValue').text($(this).val() + '%');
        if (ctxSip.Stream) {
            ctxSip.Stream.volume = ctxSip.callVolume;
        }
    });

    // Keypad Modal
    $('#btnInCallKeypad').click(function() {
        $('#keypad-modal').addClass('active');
    });

    $('#closeKeypad').click(function() {
        $('#keypad-modal').removeClass('active');
    });

    $('.keypad-btn').click(function() {
        var digit = $(this).data('digit');
        $('#keypadDisplay').append(digit);
        if (ctxSip.callActiveID) {
            ctxSip.phoneDTMFButtonPressed(digit);
        }
    });

    $('#keypadSend').click(function() {
        // Logic to send DTMF string if needed
        $('#keypad-modal').removeClass('active');
    });

    // In-call buttons
    $('#btnMute').click(function() {
        if (ctxSip.callActiveID) {
            ctxSip.phoneMuteButtonPressed(ctxSip.callActiveID);
        }
    });

    $('#btnHold').click(function() {
        if (ctxSip.callActiveID) {
            ctxSip.phoneHoldButtonPressed(ctxSip.callActiveID);
        }
    });

}); // document.ready

