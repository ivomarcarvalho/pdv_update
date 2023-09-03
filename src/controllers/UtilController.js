const moment = require('moment/moment');

// Função utilitária para tratamento de erro
function handleErrors(err) {
    console.error('Ocorreu um erro:', err);
    throw new Error('Erro no processo de sincronização.');
}

// Função utilitária para formatar data
function dateFormat(date, format) {
    if (format == null) {
        format = 'YYYY-MM-DD'
    }
    const dt = date === null || date === undefined ? moment(new Date).format(format) : moment(date).format(format)
    return (dt)
}

// Função utilitária para formatar hora
function timeFormat(time, format) {
    if (format == null) {
        format = 'HH:mm:ss'
    }
    const hora = time === null || time === undefined ? moment(new Date, 'hh:mm:ss').format(format) : moment(time, 'hh:mm:ss').format(format)
    return (hora)
}
module.exports ={dateFormat,timeFormat}

