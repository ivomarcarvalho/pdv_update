const express = require('express')
const djsystem = require('./src/controllers/DjsystemController')
const { errorLogger, infoLogger } = require('./logger')

const app = express()

app.use(express.json())

const importarPdvInicializacao = () => {

  djsystem.pdv()
    .catch(error => {
      errorLogger.error('Erro na importação dos arquivos djsystem', error)
    })
}

// executa Periodicamente
const importarPdvPeriodicamente = () => {
  setInterval(() => {
    djsystem.pdv()
      .catch(error => {
        errorLogger.error('Erro na importação dos arquivos djsystem', error)
      })
  }, 300000)
}

app.listen(3333, () => {
  infoLogger.info('Server is running ...');

  importarPdvInicializacao();
  importarPdvPeriodicamente();

});

// Encerra o servidor e outras operações quando o aplicativo é encerrado
process.on('SIGINT', () => {
  infoLogger.info('Server shutting down...');
  
  // Coloque aqui qualquer lógica de limpeza ou encerramento de recursos necessários
  process.exit(0);
});