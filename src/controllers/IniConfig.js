const fs = require('fs');
const ini = require('ini')
const { resolve } = require('path');
const path = require('path')
require('dotenv').config();

function conf() {
    const iniName = 'pdv_update.ini'
    let execDir
    let iniPath

    // Verifica se a variável de ambiente NODE_ENV está definida como 'production'
    if (process.env.NODE_ENV === 'production') {
        // Use o caminho para produção
        execDir = path.dirname(process.execPath);
        console.log('Diretório do Executável (Produção):', execDir);

    } else {
        // Use o caminho para desenvolvimento
        execDir = resolve(__dirname, '../../')
        console.log('Caminho Local (Desenvolvimento):', execDir);
    }

    iniPath = path.join(execDir, iniName);
    const config = ini.parse(fs.readFileSync(iniPath, 'utf-8'))

    return config
}

module.exports = conf()