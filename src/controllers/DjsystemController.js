const fs = require('fs');
const { executeQuery, dbOptions, firebird, executeQueryTrx } = require('../database/configFirebird')
const { dateFormat } = require('./UtilController');
const config = require('./IniConfig')


async function pdv() {
    try {
        const dirfiles = config.djsystem.pdvPath
        const pdvFiles = await getFiles(dirfiles);
        console.log('**************************************************')
        console.log('Arquivos encontrados:', pdvFiles.length);
        if (pdvFiles.length != 0) {
            for (const file of pdvFiles) {
                console.log(`Processando arquivo: ${file}`);
                await vendaPdv(`${dirfiles}/${file}`);
            }
            console.log('Todos os arquivos foram processados.');
        } else {
            console.log('Nenhum arquivo localizado em: "' + dirfiles + '"');
        }

    } catch (error) {
        console.error('Erro ao processar arquivos:', error);
    }
}

async function getFiles(dirfiles) {
    const pdvFiles = []
    if (!fs.existsSync(dirfiles)) {
        console.log('**************** Diretório inexistente! ', dirfiles, '***********************************')
    } else {
        const files = fs.readdirSync(dirfiles);
        for (const file of files) {
            if (file.indexOf('.') !== 0 && file.slice(-4) === '.djm') {
                pdvFiles.push(file)
            }
        }
    }
    return pdvFiles

}

async function vendaPdv(file) {
    try {
        console.log(`Lendo arquivo: ${file}`);

        const data = await fs.promises.readFile(file, 'utf-8');
        const linhas = data.split(/\r?\n/);

        let registrosINI = [];
        let registrosDIT = [];
        let registrosDOC = [];
        let registrosFIM = [];

        for (const linha of linhas) {
            const campo = linha.split('|');

            if (campo[0] === 'INI') {
                registrosINI.push(campo);
            } else if (campo[0] === 'DIT') {
                registrosDIT.push(campo);
            } else if (campo[0] === 'DOC') {
                registrosDOC.push(campo);
            } else if (campo[0] === 'FIM') {
                registrosFIM.push(campo);
            }
        }

        //console.log(`Arquivo ${file} lido com sucesso.`);
        //console.log(`Registros INI: ${registrosINI.length}`);
        //console.log(`Registros DIT: ${registrosDIT.length}`);
        //console.log(`Registros FIM: ${registrosFIM.length}`);

        await finalizarProcessamento(registrosINI, registrosDIT, registrosDOC, registrosFIM)
            .then(() => {
                moveFile(file)
            })
            .then(() => {
                console.log(`Processamento do arquivo ${file} concluído.`);
                console.log('*********************************')
            })
            .catch((err) => {
                const firebirdErrorMessage = err.message;
                // Remover caracteres não imprimíveis e trocar \r por quebra de linha
                const cleanedErrorMessage = firebirdErrorMessage.replace(/[^ -~]+/g, '').replace(/\r/g, '\n');
                console.error('Erro na inclusão do arquivo Djsystem:');
                console.error(cleanedErrorMessage);
            })
    } catch (err) {
        console.error(`Erro no arquivo ${file}:`, err);
    }
}

async function moveFile(file) {
    const oldPath = file
    const fileName = oldPath.slice(-12);   // Pega apenas o nome do arquivo
    let newPath = config.djsystem.pdvExportadoPath
    //var newPath = file.slice(0, - 12) + 'exportado//' + file.slice(-12)

    // Verifique se newPath termina com uma barra invertida ("\")
    if (!newPath.endsWith("\\")) {
        newPath += "\\";
    }
    if (!fs.existsSync(newPath)) {
        await fs.mkdirSync(newPath, { recursive: true }); // Crie o diretório pai se não existir (usando recursive: true)
    }

    const newFilePath = newPath + fileName
    await fs.rename(oldPath, newFilePath, function (err) {
        if (err) throw err
        console.log(oldPath + ' movido para ' + newFilePath)

        //console.log('Successfully renamed - AKA moved!')
    })

}



async function finalizarProcessamento(registrosINI, registrosDIT, registrosDOC, registrosFIM) {
    return new Promise((resolve, reject) => {

        firebird.attach(dbOptions, async function (err, db) {
            if (err) {
                throw new Error('Erro de conexão com o banco Firebird: ' + err);
            }

            // Iniciar transação
            db.transaction(firebird.ISOLATION_READ_COMMITTED, async function (err, transaction) {
                if (err) {
                    // throw new Error('Erro ao iniciar transação: ' + err);
                    reject(err)
                }
                try {
                    // Obter último sequencial
                    let ssql = 'SELECT MAX(sequencia_operacao) as max_seq FROM m_operacao WHERE cr_operacao = ?';
                    let filtro = ['001'];
                    let nextSeq = await getLatestSequence(ssql, filtro);
                    let valorTotal
                    nextSeq++;
                    console.log(nextSeq)

                    for (const campo of registrosDOC) {
                        valorTotal = campo[17]
                    }
                    // Inserir dados no m_operacao
                    for (const campo of registrosINI) {
                        ssql = `insert into m_operacao (cr_operacao,\
                                                        sequencia_operacao,\
                                                        cr_tipo_operacao, \
                                                        codigo_tipo_operacao,\
                                                        cr_cliente,\
                                                        codigo_cliente,\
                                                        cr_vendedor,\
                                                        codigo_vendedor,\
                                                        data_emissao,\
                                                        cpf_cnpj_faturamento,\
                                                        inclusao_usuario) \
                                                 values(?,?,?,?,?,?,?,?,?,?,?)`
                        await executeQueryTrx(transaction, ssql, [
                            '001',                                  // cr_operacao
                            nextSeq,                                // sequencia_operacao
                            '001',                                  // cr_tipo_operacao
                            config.geral.codigo_tipo_operacao,      // codigo_tipo_operacao  
                            '001',                                  // cr_cliente
                            config.geral.codigo_cliente,            // codigo_cliente
                            '001',                                  // cr_vendedor
                            1,                                      // codigo_vendedor
                            dateFormat('2023-09-03', 'DD.MM.YYYY'), // data_emissao
                            '11111111111',                          // cpf_cnpj_faturamento
                            `${campo[8]}`                           // inclusao_usuario
                        ])
                    }

                    // Inserir dados no m_operacao_itens
                    for (const campo of registrosDIT) {
                        // pegar fator de multiplicação
                        ssql = 'SELECT fator_multiplicacao FROM c_produto WHERE cr_produto = ? AND codigo_produto = ?';
                        filtro = ['001', campo[7]];
                        let fator = await getFatorMultiplicacao(ssql, filtro);
                        const qtde = fator === 1 ? Math.trunc(campo[8]) : 1;
                        const peso_metro = fator === 1 ? 0 : campo[8];
                        ssql = `insert into m_operacao_itens (cr_operacao,\
                                                              sequencia_operacao,\
                                                              numero_item,\
                                                              cr_produto,\
                                                              codigo_produto,\
                                                              qtde,\
                                                              peso_metro,\
                                                              vlr_unitario_venda,\
                                                              tot_liquido_item\
                                                              )\
                                                      values (?,?,?,?,?,?,?,?,?)`
                        await executeQueryTrx(transaction, ssql, [
                            '001',                                   // cr_operacao
                            nextSeq,                                 // sequencia_operacao
                            `${campo[5]}`,                           // item
                            '001',                                   // cr_produto
                            `${campo[7]}`,                           // código do produto
                            qtde,                                       // qtde
                            peso_metro,                           // quantidade numeric(9,3)
                            `${campo[9]}`,                           // valor unitário numeric(12,3)
                            `${campo[16]}`                           // valor total numeric(12,2)
                        ])
                    }
                    // disparar procedure de encerramento da operação
                    const ssqlProcedure1 = 'EXECUTE PROCEDURE SP_OPERACAO_ENCERRAMENTO (?, ?, ?, ?)';
                    const paramsProcedure1 = ['001', nextSeq, 1, 'pdv_update'];                     // Parâmetros da stored procedure
                    await executeQueryTrx(transaction, ssqlProcedure1, paramsProcedure1);

                    // disparar procedure da baixa do receber
                    const ssqlProcedure2 = 'EXECUTE PROCEDURE SP_RECEBER_BAIXA_TITULO_PDV (?, ?, ?)';
                    const paramsProcedure2 = [nextSeq, valorTotal, dateFormat('2023-09-03', 'DD.MM.YYYY')];                     // Parâmetros da stored procedure
                    await executeQueryTrx(transaction, ssqlProcedure2, paramsProcedure2);


                    // Commit da transação
                    transaction.commit(function (err) {
                        if (err) {
                            transaction.rollback(function () {
                                console.error('Erro ao confirmar transação. Rollback realizado. ' + err);
                                reject(new Error('Erro ao confirmar transação. Rollback realizado. ' + err));
                            });
                        } else {
                            console.log('Transação confirmada');
                            resolve()
                        }
                    });

                } catch (error) {
                    // Trate o erro aqui, talvez faça um log dele
                    //console.error('Erro durante o processamento:', error);

                    // const firebirdErrorMessage = error.message || 'Erro desconhecido';
                    // const formattedErrorMessage = firebirdErrorMessage.replace(/\r?\n/g, ' '); // Substitui quebras de linha por espaço
                    // console.error('Erro ao finalizar processamento:', formattedErrorMessage);                    

                    // Reverta a transação
                    transaction.rollback(function () {
                        reject(new Error('Erro durante o processamento: ' + error.message));
                    });

                }

            })
        })

    })
}

// pegar última sequencia da tabela
// ex:  ssql = 'SELECT MAX(sequencia_operacao) as max_seq FROM m_operacao WHERE cr_operacao = ?'
//      filtro = ['001]

async function getLatestSequence(ssql, filtro) {
    return new Promise((resolve, reject) => {
        executeQuery(ssql, filtro, (err, result) => {
            if (err) {
                reject(err);
            } else {
                //se não existir retorna 1 
                resolve(result[0].max_seq || 1);
            }
        });
    });
}
async function getFatorMultiplicacao(ssql, filtro) {
    return new Promise((resolve, reject) => {
        executeQuery(ssql, filtro, (err, result) => {
            if (err) {
                reject(err);
            } else {
                // se fator for zero ou nulo retorna 1
                resolve(result[0].fator_multiplicacao || 1);
            }
        });
    });
}

module.exports = { pdv }
