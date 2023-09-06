# criar projeto
npm init -y
ou
expo init pdv_update
# log
npm i winston

# pdv_update" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ivomarcarvalho/pdv_update.git
git push -u origin main

# em caso de erro push forçado
git push -f origin main

# empacotar o app
npm install -g pkg
pkg .

#
npm i nodemon -D
npm i express

# pacote .ini
npm install –save ini

# banco de dados
npm install node-firebird

# arquivo de configuração .env 
npm i dotenv

# pacote moment().format('YYYY/MM/HH')
yarn add moment

# sequelize
npx sequelize-cli init

# criar e manipular migrations
npx sequelize-cli migration:generate --name create-usuario
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo:all