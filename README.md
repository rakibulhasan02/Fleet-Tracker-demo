# Fleet Maintenance & Fuel Tracker (HTML + CSS + JS front end)

- `public/`  -> the website: HTML pages, `css/style.css`, `js/app.js`
- `server.js` -> small Node/Express API that talks to MySQL
- `sql/schema.sql` -> database

## Run
1. Start MySQL in XAMPP and import `sql/schema.sql` in phpMyAdmin (skip if already done).
2. `npm install`
3. `npm run seed`   (only once)
4. `npm start`  then open http://localhost:3000

Demo logins (password 123456): admin@demo.com, owner@demo.com, driver@demo.com, mechanic@demo.com
