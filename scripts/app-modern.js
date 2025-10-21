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
    $('#btnAnswer').click(function() {
        if (ctxSip && ctxSip.sipAnswer && ctxSip.callActiveID) {
            ctxSip.sipAnswer(ctxSip.callActiveID);
        }
    });

    $("#btnHangup").click(function() {
        console.log("btnHangup clicked. callActiveID: ", ctxSip.callActiveID);
        if (ctxSip && ctxSip.sipHangUp && ctxSip.callActiveID) {
            ctxSip.sipHangUp(ctxSip.callActiveID);
        } else {
            console.log("btnHangup: ctxSip or callActiveID is not defined.");
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
            // Show both buttons by default (will be hidden if needed)
            $('#btnAnswer').show();
            $('#btnHangup').show();
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

            newSess.displayName = newSess.remoteIdentity.displayName || newSess.remoteIdentity.uri.user;
            newSess.ctxid       = ctxSip.getUniqueID();

            var status;

            // Update UI for incoming/outgoing call
            ctxSip.showActiveCallScreen();

            if (newSess.direction === 'incoming') {
                status = "Recebendo: "+ newSess.displayName;
                ctxSip.startRingTone();
                // For incoming calls, show answer and hangup buttons
                $("#btnAnswer").show();
                $("#btnHangup").show();
            } else {
                status = "Tentando: "+ newSess.displayName;
                ctxSip.startRingbackTone();
                // For outgoing calls, hide answer button, show only hangup button
                $("#btnAnswer").hide();
                $("#btnHangup").show();
            }

            ctxSip.logCall(newSess, "ringing");
            ctxSip.setCallSessionStatus(status);

            // Update UI for incoming/outgoing call
            ctxSip.showActiveCallScreen();
            $('#activeCallName').text(newSess.displayName);
            $('#activeCallNumber').text(ctxSip.formatPhone(newSess.remoteIdentity.uri.user));
            $('#callTimer').text('00:00:00');

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
                // If there is another active call, hold it
                if (ctxSip.callActiveID && ctxSip.callActiveID !== newSess.ctxid) {
                    ctxSip.phoneHoldButtonPressed(ctxSip.callActiveID);
                }

                ctxSip.stopRingbackTone();
                ctxSip.stopRingTone();
                ctxSip.setCallSessionStatus('Conectado');
                ctxSip.logCall(newSess, 'answered');
                ctxSip.callActiveID = newSess.ctxid;
                
                // Once call is accepted, hide answer button (if it was an incoming call)
                $("#btnAnswer").hide();
                // Ensure hangup button is visible for active call
                $("#btnHangup").show();

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
                if (this.direction === 'outgoing') {
                    ctxSip.callActiveID = null;
                    newSess             = null;
                    ctxSip.logCall(this, 'ended');
                    ctxSip.endCall();
                }
            });

            newSess.on('bye', function(e) {
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus("");
                ctxSip.logCall(newSess, 'ended');
                ctxSip.callActiveID = null;
                newSess             = null;
                ctxSip.endCall();
            });

            newSess.on('failed',function(e) {
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus('Terminada');
                ctxSip.endCall();
            });

            newSess.on('rejected',function(e) {
                ctxSip.stopRingTone();
                ctxSip.stopRingbackTone();
                ctxSip.setCallSessionStatus('Rejeitada');
                ctxSip.callActiveID = null;
                ctxSip.logCall(this, 'ended');
                newSess             = null;
                ctxSip.endCall();
            });

            ctxSip.Sessions[newSess.ctxid] = newSess;
        },

        endCall : function() {
            // Stop timer
            if (ctxSip.callActiveID && ctxSip.callTimers[ctxSip.callActiveID]) {
                clearInterval(ctxSip.callTimers[ctxSip.callActiveID].interval);
                delete ctxSip.callTimers[ctxSip.callActiveID];
            }

            // Reset UI
            setTimeout(function() {
                ctxSip.showSplashScreen();
                $('#callTimer').text('00:00:00');
                $('#btnMute').removeClass('active');
                $('#btnHold').removeClass('active');
            }, 1000);
        },

        // getUser media request refused or device was not present
        getUserMediaFailure : function(e) {
            window.console.error('getUserMedia failed:', e);
            alert('Erro de Mídia: Você deve permitir acesso ao seu microfone.');
        },

        getUserMediaSuccess : function(stream) {
             ctxSip.Stream = stream;
        },

        /**
         * sets the ui call status field
         */
        setCallSessionStatus : function(status) {
            $('#txtCallStatus').html(status);
        },

        /**
         * sets the ui connection status field
         */
        setStatus : function(status) {
            $("#txtRegStatus").html(status);
        },

        /**
         * logs a call to localstorage
         */
        logCall : function(session, status) {

            var log = {
                    clid : session.displayName,
                    uri  : session.remoteIdentity.uri.toString(),
                    id   : session.ctxid,
                    time : new Date().getTime()
                },
                calllog = JSON.parse(localStorage.getItem('sipCalls'));

            if (!calllog) { calllog = {}; }

            if (!calllog.hasOwnProperty(session.ctxid)) {
                calllog[log.id] = {
                    id    : log.id,
                    clid  : log.clid,
                    uri   : log.uri,
                    start : log.time,
                    flow  : session.direction
                };
            }

            if (status === 'ended') {
                calllog[log.id].stop = log.time;
            }

            if (status === 'ended' && calllog[log.id].status === 'ringing') {
                calllog[log.id].status = 'missed';
            } else {
                calllog[log.id].status = status;
            }

            localStorage.setItem('sipCalls', JSON.stringify(calllog));
        },

        /**
         * updates the call log ui
         */
        logShow : function() {

            var calllog = JSON.parse(localStorage.getItem('sipCalls')),
                x       = [];

            if (calllog !== null) {

                // empty existing logs
                $('#sip-logitems').empty();

                // Add start time to array
                $.each(calllog, function(k,v) {
                    x.push(v);
                });

                // sort descending
                x.sort(function(a, b) {
                    return b.start - a.start;
                });

                $.each(x, function(k, v) {
                    ctxSip.logItem(v);
                });

            } else {
                $('#sip-logitems').html('<p class="empty-state">No recent calls from this browser.</p>');
            }
        },

        /**
         * adds a ui item to the call log
         */
        logItem : function(item) {

            var callLength = (item.status !== 'ended')? 'Ativo': moment.duration(item.stop - item.start).humanize(),
                callIcon;

            switch (item.status) {
                case 'ringing'  :
                    callIcon  = 'fa-bell';
                    break;
                case 'missed'   :
                    if (item.flow === "incoming") { callIcon = 'fa-phone-slash'; }
                    if (item.flow === "outgoing") { callIcon = 'fa-phone'; }
                    break;
                case 'holding'  :
                    callIcon  = 'fa-pause';
                    break;
                case 'answered' :
                case 'resumed'  :
                    callIcon  = 'fa-phone';
                    break;
                case 'ended'  :
                    if (item.flow === "incoming") { callIcon = 'fa-phone-arrow-down-left'; }
                    if (item.flow === "outgoing") { callIcon = 'fa-phone-arrow-up-right'; }
                    break;
            }

            var i  = '<div class="sip-logitem" data-uri="'+item.uri+'" data-sessionid="'+item.id+'">';
            i += '<div><i class="fa '+callIcon+'"></i> <strong>'+ctxSip.formatPhone(item.uri)+'</strong></div>';
            i += '<div><small>'+moment(item.start).format('MM/DD hh:mm a')+'</small> - ' + callLength+'</div>';
            i += '</div>';

            $('#sip-logitems').append(i);
        },

        /**
         * removes log items from localstorage and updates the UI
         */
        logClear : function() {
            localStorage.removeItem('sipCalls');
            ctxSip.logShow();
        },

        sipCall : function(target) {

            try {
                var s = ctxSip.phone.invite(target, {
                    media : {
                        stream      : ctxSip.Stream,
                        constraints : { audio : true, video : false },
                        render      : {
                            remote : $('#audioRemote').get()[0]
                        },
                        RTCConstraints : { "optional": [{ 'DtlsSrtpKeyAgreement': 'true'} ]}
                    }
                });
                s.direction = 'outgoing';
                ctxSip.newSession(s);

            } catch(e) {
                throw(e);
            }
        },

        sipTransfer : function(sessionid) {

            var s      = ctxSip.Sessions[sessionid],
                target = window.prompt('Digite o número de destino', '');

            if (target) {
                ctxSip.setCallSessionStatus('<i>Transferindo a chamada...</i>');
                s.refer(target);
            }
        },

        sipAnswer : function(sessionid) {
            var s = ctxSip.Sessions[sessionid];
            if (!s) {
                return;
            }
            
            // Answer the incoming call
            if (s.direction === 'incoming' && !s.startTime) {
                s.accept({
                    media: {
                        stream: ctxSip.Stream,
                        constraints: { audio: true, video: false },
                        render: {
                            remote: $('#audioRemote').get()[0]
                        }
                    }
                });
            }
        },

        sipHangUp : function(sessionid) {
            console.log("sipHangUp called with sessionid: ", sessionid);
            var s = ctxSip.Sessions[sessionid];
            if (!s) {
                console.log("sipHangUp: Session not found for ID: ", sessionid);
                return;
            }
            console.log("sipHangUp: Session object: ", s);
            
            // Check session state to determine how to end the call
            if (s.startTime) {
                console.log("sipHangUp: Call connected, using bye().");
                s.bye();
            } else if (s.direction === 'incoming') {
                console.log("sipHangUp: Incoming call, rejecting.");
                s.reject();
            } else {
                console.log("sipHangUp: Outgoing call, cancelling.");
                s.cancel();
            }
            // After hanging up, clear the active call ID and show splash screen
            ctxSip.callActiveID = null;
            ctxSip.showSplashScreen();
        },

        sipSendDTMF : function(digit) {

            try { ctxSip.dtmfTone.play(); } catch(e) { }

            var a = ctxSip.callActiveID;
            if (a) {
                var s = ctxSip.Sessions[a];
                s.dtmf(digit);
            }
        },

        phoneCallButtonPressed : function(sessionid) {

            var s      = ctxSip.Sessions[sessionid],
                target = $("#numDisplay").val();

            if (!s) {

                $("#numDisplay").val("");
                ctxSip.sipCall(target);

            } else if (s.accept && !s.startTime) {

                s.accept({
                    media : {
                        stream      : ctxSip.Stream,
                        constraints : { audio : true, video : false },
                        render      : {
                            remote : { audio: $('#audioRemote').get()[0] }
                        },
                        RTCConstraints : { "optional": [{ 'DtlsSrtpKeyAgreement': 'true'} ]}
                    }
                });
            }
        },

        phoneMuteButtonPressed : function (sessionid) {

            var s = ctxSip.Sessions[sessionid];

            if (!s.isMuted) {
                s.mute();
            } else {
                s.unmute();
            }
        },

        phoneHoldButtonPressed : function(sessionid) {

            var s = ctxSip.Sessions[sessionid];

            if (s.isOnHold().local === true) {
                s.unhold();
            } else {
                s.hold();
            }
        },

        hasWebRTC : function() {

            if (navigator.webkitGetUserMedia) {
                return true;
            } else if (navigator.mozGetUserMedia) {
                return true;
            } else if (navigator.getUserMedia) {
                return true;
            } else {
                alert('Navegador Não Suportado: Seu navegador não suporta os recursos necessários para este telefone.');
                window.console.error("WebRTC support not found");
                return false;
            }
        }
    };

    // Throw an error if the browser can't hack it.
    if (!ctxSip.hasWebRTC()) {
        return true;
    }

    ctxSip.phone = new SIP.UA(ctxSip.config);

    ctxSip.phone.on('connected', function(e) {
        ctxSip.setStatus("Connected");
    });

    ctxSip.phone.on('disconnected', function(e) {
        ctxSip.setStatus("Desconectado");
        alert('WebSocket Desconectado: Ocorreu um erro ao conectar ao websocket.');
    });

    ctxSip.phone.on('registered', function(e) {

        var closeEditorWarning = function() {
            return 'Se você fechar esta janela, não poderá fazer ou receber chamadas do seu navegador.';
        };

        var closePhone = function() {
            localStorage.removeItem('ctxPhone');
            ctxSip.phone.stop();
        };

        window.onbeforeunload = closeEditorWarning;
        window.onunload       = closePhone;

        localStorage.setItem('ctxPhone', 'true');

        ctxSip.setStatus("Pronto");

        // Get the userMedia and cache the stream
        if (SIP.WebRTC.isSupported()) {
            SIP.WebRTC.getUserMedia({ audio : true, video : false }, ctxSip.getUserMediaSuccess, ctxSip.getUserMediaFailure);
        }
    });

    ctxSip.phone.on('registrationFailed', function(e) {
        alert('Erro de Registro: Ocorreu um erro ao registrar seu telefone. Verifique suas configurações.');
        ctxSip.setStatus("Erro: Falha no Registro");
    });

    ctxSip.phone.on('unregistered', function(e) {
        alert('Erro de Registro: Ocorreu um erro ao registrar seu telefone. Verifique suas configurações.');
        ctxSip.setStatus("Erro: Falha no Registro");
    });

    ctxSip.phone.on('invite', function (incomingSession) {
        var s = incomingSession;
        s.direction = 'incoming';
        ctxSip.newSession(s);
    });

    // ========== EVENT HANDLERS ==========

    // Call button
    $('#btnCall').click(function() {
        ctxSip.phoneCallButtonPressed();
    });

    // Answer button
    $('#btnAnswer').click(function() {
        ctxSip.sipAnswer(ctxSip.callActiveID);
    });

    // Hangup button
    $('#btnHangup').click(function() {
        ctxSip.sipHangUp(ctxSip.callActiveID);
    });

    // Mute button
    $('#btnMute').click(function() {
        ctxSip.phoneMuteButtonPressed(ctxSip.callActiveID);
    });

    // Hold button
    $('#btnHold').click(function() {
        ctxSip.phoneHoldButtonPressed(ctxSip.callActiveID);
    });

    // Transfer button
    $('#btnTransfer').click(function() {
        ctxSip.sipTransfer(ctxSip.callActiveID);
    });

    // Dial input - Enter key
    $('#numDisplay').keypress(function(e) {
        if (e.which === 13) {
            ctxSip.phoneCallButtonPressed();
        }
    });

    // ========== NUMERIC KEYPAD HANDLERS ==========

    // Numeric keypad on splash screen
    $('.num-btn').click(function() {
        var num = $(this).data('num');
        var current = $('#numDisplay').val();
        $('#numDisplay').val(current + num);
    });

    // ========== MODAL HANDLERS ==========

    // Keypad Modal
    $('#btnKeypad, #btnInCallKeypad').click(function() {
        $('#keypad-modal').addClass('active');
        $('#keypadDisplay').text($('#numDisplay').val());
    });

    $('#closeKeypad').click(function() {
        $('#keypad-modal').removeClass('active');
    });

    $('.keypad-btn').click(function() {
        var digit = $(this).data('digit');
        var current = $('#keypadDisplay').text();
        $('#keypadDisplay').text(current + digit);
        $('#numDisplay').val(current + digit);
        ctxSip.sipSendDTMF(digit);
    });

    $('#keypadSend').click(function() {
        $('#numDisplay').val($('#keypadDisplay').text());
        $('#keypad-modal').removeClass('active');
    });

    // History Modal
    $('#btnHistory').click(function() {
        ctxSip.logShow();
        $('#history-modal').addClass('active');
    });

    $('#closeHistory').click(function() {
        $('#history-modal').removeClass('active');
    });

    $('#clearHistory, #btnClearHistory').click(function() {
        ctxSip.logClear();
    });

    // Call from history
    $('#sip-logitems').delegate('.sip-logitem', 'click', function() {
        var uri = $(this).data('uri');
        $('#numDisplay').val(uri);
        $('#history-modal').removeClass('active');
    });

    // Volume Modal
    $('#btnVolume').click(function() {
        $('#volume-modal').addClass('active');
    });

    $('#closeVolume').click(function() {
        $('#volume-modal').removeClass('active');
    });

    $('#sldVolume').on('input change', function() {
        var v = $(this).val();
        $('#volumeValue').text(v + '%');
        
        var volume = v / 100;
        var active = ctxSip.callActiveID;

        if (ctxSip.Sessions[active]) {
            ctxSip.Sessions[active].player.volume = volume;
            ctxSip.callVolume = volume;
        }

        $('audio').each(function() {
            $(this).get()[0].volume = volume;
        });
    });

    // Config Modal handlers already set up at the beginning

    // Close modals on background click
    $('.modal').click(function(e) {
        if (e.target === this) {
            $(this).removeClass('active');
        }
    });

    // Auto-focus number input on backspace
    $('#sipClient').keydown(function(event) {
        if (event.which === 8) {
            $('#numDisplay').focus();
        }
    });

});

