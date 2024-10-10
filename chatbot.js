const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const sqlite3 = require('sqlite3').verbose();
const client = new Client();

// Conectar ao banco de dados SQLite
let db = new sqlite3.Database('./chatbot.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabelas no banco de dados
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        whatsapp_id TEXT UNIQUE NOT NULL
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS linhas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT NOT NULL UNIQUE,
            descricao TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS atualizacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linha_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        mensagem TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (linha_id) REFERENCES linhas (id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS inscricoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        linha_id INTEGER NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
        FOREIGN KEY (linha_id) REFERENCES linhas (id),
        UNIQUE (usuario_id, linha_id)
        )`);
        
        // cria as linhas no banco de dados
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (11, 'Sion/Beira-Rio')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (12, 'Boa Vista/Jacuí')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (13, 'Rosário/Beira-Rio')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (14, 'Rosário/Hospital')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (20, 'Satélite/Mirante Dos Cristais')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (21, 'Satélite/Beira-Rio')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (22, 'Satélite/Nova Monlevade')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (30, 'Estrela D alva/Hospital')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (31, 'Estrela D alva/Beira-Rio')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (32, 'Laranjeiras/Beira-Rio')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (33, 'Laranjeiras/Planalto')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (40, 'Planalto/Belmonte')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (42, 'Circular Centro')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (43, 'Santa Cecília/Rodoviária')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (45, 'Pedreira/Carneirinhos')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (104, 'Teresópolis/Santa Bárbara')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (141, 'República/Hospital')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (151, 'República/Divisa')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (152, 'Rodoviária/Forúm')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (153, 'Teresópolis/Santa Cruz')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (154, 'ABM/Santa Bárbara')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (155, 'Promorar/República')`);
        db.run(`INSERT OR IGNORE INTO linhas (numero, descricao) VALUES (156, 'Tanquinho/Divisa')`);
        
    });

// Iniciar o client do WhatsApp Web
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

client.initialize();

// cache simples em memória para armazenar usuários já verificados durante a execução do bot
const usuariosCache = new Set();

// Funções para manipular informações do banco de dados

// Função apara verificar se um usuário já existe no banco de dados
const verificarUsuarioExiste = async (whatsapp_id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM usuarios WHERE whatsapp_id = ?", [whatsapp_id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row !== undefined);
            }
        });
    });
};  
    
// Função para criar um usuário no banco de dados
const criarUsuario = async (whatsapp_id, nome) => {
    if (usuariosCache.has(whatsapp_id)) {
        return; // Usuário já está no cache
    }

    const usuarioExiste = await verificarUsuarioExiste(whatsapp_id);
    if (!usuarioExiste) {
        db.run("INSERT OR IGNORE INTO usuarios (nome, whatsapp_id) VALUES (?, ?)", [nome, whatsapp_id], function (err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`Usuário adicionado: ${nome}`);
        });
        usuariosCache.add(whatsapp_id); // Adicionar ao cache
    } else {
        usuariosCache.add(whatsapp_id); // Adicionar ao cache mesmo se já existir
    }
};

// Função para inserir atualização de linha no banco de dados
function inserirAtualizacaoLinha(linha, mensagem, usuario_id) {
    db.get(`SELECT id FROM linhas WHERE numero = ?`, [linha], (err, row) => {
        if (err) {
            return console.error(err.message); 
        }

        if (!row) {
            db.run(`INSERT INTO linhas (numero, descricao) VALUES (?, ?)`, [linha, ''], function(err) {
                if (err) {
                    return console.error(err.message);
                }
                let linha_id = this.lastID;
                db.run(`INSERT INTO atualizacoes (linha_id, usuario_id, mensagem) VALUES (?, ?, ?)`, [linha_id, usuario_id, mensagem]);
            });
        } else {
            db.run(`INSERT INTO atualizacoes (linha_id, usuario_id, mensagem) VALUES (?, ?, ?)`, [row.id, usuario_id, mensagem]);
        }
    });
}

// Função para buscar atualizações de uma linha específica
function buscarAtualizacoesLinha(linha, callback) {
    db.all(`SELECT linhas.numero, atualizacoes.mensagem, atualizacoes.timestamp, usuarios.nome FROM atualizacoes
            JOIN linhas ON atualizacoes.linha_id = linhas.id
            JOIN usuarios ON atualizacoes.usuario_id = usuarios.id
            WHERE linhas.numero = ? ORDER BY atualizacoes.timestamp DESC`, [linha], (err, rows) => {
        if (err) {
            throw err;
        }
        callback(rows);
    });
}

// Função para adicionar usuário a uma linha de transmissão
function adicionarUsuarioALinha(linha, whatsapp_id) {
    db.get(`SELECT id FROM usuarios WHERE whatsapp_id = ?`, [whatsapp_id], (err, usuario) => {
        if (err) {
            return console.error(err.message);
        }
        
        db.get(`SELECT id FROM linhas WHERE numero = ?`, [linha], (err, linhaRow) => {
            if (err) {
                return console.error(err.message);
            }
            
            if (linhaRow) {
                db.run(`INSERT OR IGNORE INTO inscricoes (usuario_id, linha_id) VALUES (?, ?)`, [usuario.id, linhaRow.id], function(err) {
                    if (err) {
                        return console.error(err.message);
                    }
                });
            } else {
                console.log(`Linha ${linha} não encontrada.`);
            }
        });
    });
}

// Função para enviar atualizações para todos os usuários da linha
async function enviarAtualizacaoParaLinha(linha, mensagem, whatsapp_id) {
    // Recuperar o ID do usuário com base no whatsapp_id
    db.get(`SELECT id FROM usuarios WHERE whatsapp_id = ?`, [whatsapp_id], (err, usuario) => {
        if (err) {
            return console.error(err.message);
        }
        
        if (usuario) {
            // Chamar a função inserirAtualizacaoLinha com o usuário_id recuperado
            inserirAtualizacaoLinha(linha, mensagem, usuario.id);
            
            // Enviar mensagem para todos os usuários inscritos
            db.get(`SELECT id FROM linhas WHERE numero = ?`, [linha], (err, row) => {
                if (err) {
                    return console.error(err.message);
                }
    
                if (row) {
                    db.all(`SELECT usuarios.whatsapp_id FROM inscricoes JOIN usuarios ON inscricoes.usuario_id = usuarios.id WHERE inscricoes.linha_id = ?`, [row.id], async (err, usuarios) => {
                        if (err) {
                            return console.error(err.message);
                        }
    
                        for (const usuario of usuarios) {
                            await client.sendMessage(usuario.whatsapp_id, mensagem);
                        }
                    });
                } else {
                    console.log(`Linha ${linha} não encontrada.`);
                }
            });
        } else {
            console.log(`Usuário com whatsapp_id ${whatsapp_id} não encontrado.`);
        }
    });
}

// Funçã para excluir inscrição de um usuário em uma linha
const removerUsuarioDeLinha = (linha, whatsappId) => {
    const queryLinha = 'SELECT id FROM linhas WHERE numero = ?';
    db.get(queryLinha, [linha], (err, rowLinha) => {
        if (err) {
            console.error(err);
            return;
        }
        if (!rowLinha) {
            console.log(`Linha ${linha} não encontrada.`);
            return;
        }
        const linhaId = rowLinha.id;

        const queryUsuario = 'SELECT id FROM usuarios WHERE whatsapp_id = ?';
        db.get(queryUsuario, [whatsappId], (err, rowUsuario) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!rowUsuario) {
                console.log(`Usuário ${whatsappId} não encontrado.`);
                return;
            }
            const usuarioId = rowUsuario.id;

            const queryRemover = 'DELETE FROM inscricoes WHERE linha_id = ? AND usuario_id = ?';
            db.run(queryRemover, [linhaId, usuarioId], (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Usuário ${whatsappId} removido da linha ${linha}.`);
                }
            });
        });
    });
};

// Função para criar o delay entre uma ação e outra
const delay = ms => new Promise(res => setTimeout(res, ms)); 

// Lógica principal

const handleUserMessage = async (msg) => {
    const contact = await msg.getContact();
    const chat = await msg.getChat();
    const name = contact.pushname || "Usuário Desconhecido";

    const defaultMessage = async () => {
        await delay(900);
        await chat.sendStateTyping();
        await delay(900);
        await client.sendMessage(msg.from, `Olá ${name.split(" ")[0]}! Sou o assistente da MoveUFOP. Como posso ajudá-lo hoje? Digite o número da opção que você deseja realizar:\n\n1 - Ver informações sobre linhas de ônibus\n2 - Enviar atualização sobre uma linha\n3 - Inscrever-se em uma linha\n4 - Cancelar inscrição em uma linha\n5 - Ver Horários de ônibus\n6 - Outras perguntas`);
    };

    const finalMessage = async () => {
        await delay(900);
        await chat.sendStateTyping();
        await delay(900);
        await client.sendMessage(msg.from, `Se você deseja realizar outra opção, basta digitar o número da opção correspondente:\n\n1 - Ver informações sobre linhas de ônibus\n2 - Enviar atualização sobre uma linha\n3 - Inscrever-se em uma linha\n4 - Cancelar inscrição em uma linha\n5 - Ver horários de ônibus\n6 - Outras perguntas`);
    };
    

    switch (true) {
        case msg.body.match(/^(menu|oi|ola|olá)/i) !== null:
            await defaultMessage();
            break;

        case msg.body === '1':
            await delay(900);
            await client.sendMessage(msg.from, 'Digite o número da linha que deseja informações, no formato: "Informações 152"');
            break;

        case msg.body.match(/^(informações|informacoes)/i) !== null:
            const linha = msg.body.split(' ')[1];
            buscarAtualizacoesLinha(linha, async (atualizacoes) => {
                if (atualizacoes.length === 0) {
                    await client.sendMessage(msg.from, 'Não há atualizações para esta linha.');
                } else {
                    let mensagem = `Atualizações da linha ${linha}:\n\n`;
                    atualizacoes.forEach((atualizacao, index) => {
                        mensagem += `${index + 1}. Data: (${atualizacao.timestamp}): ${atualizacao.mensagem}\n`;
                    });
                    await client.sendMessage(msg.from, mensagem);
                }
            });
            break;

        case msg.body === '2':
            criarUsuario(msg.from, name);
            await delay(900);
            await client.sendMessage(msg.from, 'Digite a linha e a atualização no formato: "Linha 152 passou no ponto X sentido Ufop às 13h30".');
            break;

        case msg.body.startsWith('Linha') && msg.body.includes('passou no ponto'):
            const linhaAtualizacao = msg.body.split(' ')[1];
            const atualizacao = msg.body.split(' ').slice(2).join(' ');
            await enviarAtualizacaoParaLinha(linhaAtualizacao, `Atualização da linha ${linhaAtualizacao}: ${atualizacao}`, msg.from);
            await client.sendMessage(msg.from, 'Atualização enviada com sucesso!');
            await finalMessage();
            break;

        case msg.body === '3':
            criarUsuario(msg.from, name);
            await delay(900);
            await client.sendMessage(msg.from, 'Digite o número da linha que deseja se inscrever no formato: "Inscrever 152".');
            break;

        case msg.body.startsWith('Inscrever') && msg.body.split(' ').length === 2:
            const linhaInscricao = msg.body.split(' ')[1];
            adicionarUsuarioALinha(linhaInscricao, msg.from);
            await client.sendMessage(msg.from, `Você foi inscrito na linha ${linhaInscricao} com sucesso!`);
            await finalMessage();
            break;

            case msg.body === '4':
            await delay(900);
            await client.sendMessage(msg.from, 'Digite o número da linha que deseja cancelar a inscrição no formato: "Cancelar 152".');
            break;

        case msg.body.startsWith('Cancelar') && msg.body.split(' ').length === 2:
            const linhaRemocao = msg.body.split(' ')[1];
            removerUsuarioDeLinha(linhaRemocao, msg.from);
            await client.sendMessage(msg.from, `Sua inscrição na linha ${linhaRemocao} foi cancelada com sucesso!`);
            await finalMessage();
            break;

            case msg.body === '5':
            await delay(900);
            await client.sendMessage(msg.from, 'Acesse os horários de ônibus através deste link: https://bus2.me/info/2you/mg/joao-monlevade/');
            await finalMessage();
            break;

        case msg.body === '6':
            await delay(900);
            await client.sendMessage(msg.from, 'Se você tiver outras dúvidas ou precisar de mais informações a respeito dos horários e das linhas de ônibus, por favor, acesse o aplicativo JMBus: http://app.mobilibus.com/jmbus');
            await finalMessage();
            break;

        default:
            await client.sendMessage(msg.from, 'Desculpe, não entendi o comando. Por favor, tente novamente.\nDigite o número da opção que você deseja realizar:\n\n1 - Ver informações sobre linhas de ônibus\n2 - Enviar atualização sobre uma linha\n3 - Inscrever-se em uma linha\n4 - Cancelar inscrição em uma linha\n5 - Ver Horários de ônibus\n6 - Outras perguntas')
            break;
    }
};

client.on('message', async (msg) => {
    if (msg.from.endsWith('@c.us')) {
        await handleUserMessage(msg);
    }
});

