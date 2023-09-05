const express = require('express')
const djsystem = require('./src/controllers/DjsystemController')


const app = express()

app.use(express.json())

const importarPdvInicializacao = () => {
  djsystem.pdv()
    .catch(error => {
      console.log('Erro na importação dos arquivos djsystem', error)
    })
}

// executa Periodicamente
const importarPdvPeriodicamente = () => {
  setInterval(() => {
    djsystem.pdv()
      .catch(error => {
        console.log('Erro na importação dos arquivos djsystem', error)
      })
  }, 300000)
}

app.listen(3333, () => {
  console.log('Server is running ...');

  importarPdvInicializacao();
  importarPdvPeriodicamente();

});

// Encerra o servidor e outras operações quando o aplicativo é encerrado
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  // Coloque aqui qualquer lógica de limpeza ou encerramento de recursos necessários
  process.exit(0);
});