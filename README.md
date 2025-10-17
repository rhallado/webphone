# Telenova Phone

**Telenova Phone** é um softphone web moderno e responsivo desenvolvido para realizar chamadas VoIP diretamente pelo navegador. Baseado no projeto ctxSip, o Telenova Phone oferece uma interface intuitiva e elegante, com suporte completo a WebRTC e WebSocket para comunicação em tempo real com servidores SIP como FreeSWITCH.

## Características

- **Interface Moderna**: Design clean e profissional com gradientes suaves e elementos visuais atraentes
- **Teclado Numérico Integrado**: Teclado numérico fixo na tela inicial para facilitar a discagem
- **Totalmente Responsivo**: Adapta-se automaticamente a diferentes tamanhos de tela (desktop, tablet, smartphone)
- **Suporte a WebRTC**: Chamadas de áudio e vídeo de alta qualidade
- **Conexão WebSocket**: Comunicação em tempo real com servidor SIP via WSS
- **Interface em Português**: Toda a interface traduzida para o português brasileiro
- **Funcionalidades Completas**: 
  - Realizar e receber chamadas
  - Controle de volume
  - Mudo (mute)
  - Retenção de chamada (hold)
  - Transferência de chamadas
  - Histórico de chamadas
  - Envio de DTMF durante chamadas

## Requisitos

- Navegador moderno com suporte a WebRTC (Chrome, Firefox, Safari, Edge)
- Servidor SIP compatível com WebSocket (FreeSWITCH, Asterisk, Kamailio, etc.)
- Certificado SSL válido para conexão WSS

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/rhallado/webphone.git
   cd webphone
   ```

2. Configure um servidor web para servir os arquivos (Apache, Nginx, ou qualquer servidor HTTP)

3. Acesse o arquivo `index.html` pelo navegador

## Configuração

Na primeira vez que acessar o Telenova Phone, você precisará configurar suas credenciais SIP:

1. Clique no ícone de configurações (engrenagem) no canto superior direito
2. Preencha os seguintes campos:
   - **Nome de Exibição**: Seu nome ou identificação
   - **Usuário SIP**: Seu número de ramal/extensão
   - **Senha**: Senha do ramal
   - **Domínio/Realm**: Domínio do servidor SIP
   - **Servidor WebSocket**: URL do servidor WebSocket (ex: `wss://sip.exemplo.com:7443`)
3. Clique em "Salvar e Recarregar"

As configurações serão salvas localmente no navegador.

## Uso

1. Digite o número de destino usando o teclado numérico ou o campo de entrada
2. Clique no botão verde de chamada para iniciar a ligação
3. Durante a chamada, você pode:
   - Ajustar o volume
   - Ativar/desativar o mudo
   - Colocar a chamada em espera
   - Transferir a chamada
   - Enviar tons DTMF usando o teclado
4. Clique no botão vermelho para encerrar a chamada

## Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilização e responsividade
- **JavaScript/jQuery**: Lógica da aplicação
- **SIP.js**: Biblioteca para comunicação SIP via WebRTC
- **WebRTC**: Protocolo para chamadas de áudio e vídeo
- **WebSocket**: Comunicação em tempo real com o servidor

## Compatibilidade

- ✅ Google Chrome (recomendado)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)
- ✅ Opera

## Versionamento

- **v1.0.0-stable**: Versão inicial com layout moderno
- **v1.1.0**: Interface traduzida para português e nome alterado para Telenova Phone
- **v1.2.0**: Adicionado teclado numérico na tela inicial
- **v1.3.0**: Interface refinada com responsividade completa

## Licença

Este projeto é baseado no [ctxSip](https://github.com/Collecttix/ctxSip) e mantém a mesma licença do projeto original.

## Suporte

Para questões, bugs ou sugestões, abra uma issue no repositório do GitHub.

