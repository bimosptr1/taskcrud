// import postgress pool
const { Pool } = require('pg')

// setup connection pool
const dbPool = new Pool({
    database: 'dbProject',
    port: 5432,
    user: 'postgres',
    password: '1'
})

// export db pool to be used
module.exports = dbPool