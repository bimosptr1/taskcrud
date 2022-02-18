const { urlencoded, request } = require('express');
const express = require('express') // pemanggilan express
const db = require('./connection/db') // import db connection


const app = express() // penggunaan package express sebagai function
const bcrypt = require('bcrypt')
const upload = require('./middlewares/uploadFile')
app.set('view engine', 'hbs'); // deklar hbs view engine
app.use('/public', express.static(__dirname + '/public')); // deklar item di public
app.use('/uploads', express.static(__dirname + '/uploads'))

const flash = require('express-flash')
const session = require('express-session')

app.use(express.urlencoded({ extended: false })) //convert link html to json

app.use(flash())

// setup express session
app.use(
    session({
        cookie: {
            maxAge: 1000 * 60 * 60 * 2,  //menyimpan cookies 2 jam
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: "secretValue"
    })
)

const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'Desember'
]

const port = 5000  // deklarasi port

// pembuatan end point / rooting
app.get('/', function (request, respon) {
    respon.render('index', {
        isLogin: request.session.isLogin,
        user: request.session.user,
    })
})

app.get('/home', function (request, respon) {

    let query
    if (request.session.isLogin) {
        query = `SELECT project, tb_project.id, startdate, enddate, description, technologies, image
    FROM tb_project
    LEFT JOIN tb_user
    ON tb_user.id = tb_project.author_id 
    WHERE tb_user.name = '${request.session.user.name}'
    ORDER BY id DESC`
    } else {
        query = `SELECT project, tb_project.id, startdate, enddate, description, technologies, image
    FROM tb_project
    LEFT JOIN tb_user
    ON tb_user.id = tb_project.author_id 
    ORDER BY id DESC`
    }

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            if (err) throw err
            let data = result.rows

            data = data.map((post) => {
                return {
                    ...post,
                    durasi: durationTime(post.startdate - post.enddate),
                    isLogin: request.session.isLogin,
                }
            })

            respon.render('index', {
                posts: data,
                isLogin: request.session.isLogin,
                user: request.session.user,
            })
        })
    })
})

app.post('/project', upload.single('image'), function (request, respon) {
    let { title, startdate, enddate, description, skillCheck } = request.body

    let project = {
        title,
        startdate,
        enddate,
        description,
        skillCheck,
        image: request.file.filename,
        author_id: request.session.user.id
    }

    let query = `INSERT INTO tb_project(project, startdate, enddate, description, image, technologies, author_id) VALUES
    ('${project.title}', '${project.startdate}', '${project.enddate}', '${project.description}','${project.image}', '{${skillCheck}}', '${project.author_id}')`

    db.connect((err, client, done) => {

        if (err) throw err
        client.query(query, (err, result) => {
            done()
            if (err) throw err

            respon.redirect('/home')
        })
    })
})

app.get('/project', function (request, respon) {
    if (!request.session.isLogin) {
        respon.redirect('/login')
    }

    respon.render('add-project', {
        isLogin: request.session.isLogin,
        user: request.session.user,
    })
})

app.get('/project/:id', function (request, respon) {
    let { id } = request.params
    let query = `SELECT * FROM tb_project where id = '${id}' `

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            if (err) throw err
            let data = result.rows

            data = data.map((post) => {
                return {
                    ...post,
                    sd: getFullTime(post.startdate),
                    ed: getFullTime(post.enddate)
                }
            })

            respon.render('project-detail', {
                posts: data,
                isLogin: request.session.isLogin,
                user: request.session.user,
            })
        })
    })
})

app.get('/delete-project/:id', function (request, respon) {
    let { id } = request.params

    let query = `DELETE FROM tb_project WHERE id = ${id}`

    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            respon.redirect('/home')
        })
    })
})

app.get('/edit-project/:id', function (request, respon) {
    let { id } = request.params

    let query = `SELECT * FROM tb_project WHERE id = ${id}`

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            if (err) throw err

            result = result.rows[0]

            respon.render('edit-project', {
                posts: result,
            })
        })
    })
})

app.post('/edit-project/:id', function (request, respon) {
    let { id } = request.params
    let title = request.body.title

    const test = {
        title,
    }
    console.log('klsafnlsa', test);


    // let query = `UPDATE tb_project 
    // SET project='${title}',description='${content}', startdate='${startdate}', enddate='${enddate}', technologies='{${skillCheck}}', image='${image}' WHERE id = ${id};`

    // db.connect((err, client, done) => {
    //     if (err) throw err

    //     client.query(query, (err, result) => {
    //         done()
    //         if (err) throw err

    //         respon.redirect('/home')
    //     })
    // })
})


app.get('/login', function (request, respon) {
    respon.render('login')
})

app.post('/login', function (request, respon) {
    let { email, password } = request.body

    db.connect((err, client, done) => {
        if (err) throw err

        let query = `SELECT * FROM tb_user WHERE email='${email}'`

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            if (result.rowCount == 0) {
                request.flash('danger', 'email and password doesnt match')
                return respon.redirect('/login')
            }

            let isMatch = bcrypt.compareSync(password, result.rows[0].password)

            if (isMatch) {
                request.session.isLogin = true
                request.session.user = {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    name: result.rows[0].name
                }

                request.flash('success', 'Login Success')
                respon.redirect('/home')
            } else {
                request.flash('danger', 'Email and password doesnt match')
                respon.redirect('/login')
            }

        })
    })
})

app.get('/sign-up', function (request, respon) {
    respon.render('register')
})

app.post('/sign-up', function (request, respon) {
    let { name, email, password } = request.body
    const hasPassword = bcrypt.hashSync(password, 10)  // convert password bcrypt

    db.connect((err, client, done) => {
        if (err) throw err
        let query = `INSERT INTO tb_user(name, email, password) VALUES
                        ('${name}','${email}','${hasPassword}')`

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            request.flash('success', 'Registration Success')
            respon.redirect('/login')
        })
    })
})

app.get('/contact', function (request, respon) {
    respon.render('contact', {
        isLogin: request.session.isLogin,
        user: request.session.user,
    })
})

app.get('/logout', function (request, respon) {
    request.session.destroy()
    respon.redirect('/home')
})

//function
function durationTime(durasi) {
    // Convert Start - End Date to Days
    let duration = Math.abs(durasi)

    let day = Math.floor(duration / (1000 * 60 * 60 * 24))

    if (day < 30) {
        return day + ` days `
    } else {
        let diffMonths = Math.ceil(duration / (1000 * 60 * 60 * 24 * 30));
        if (diffMonths >= 1) {
            return diffMonths + ` month `
        }

    }
};

function getFullTime(time) {

    const date = time.getDate()
    const monthIndex = time.getMonth()
    const year = time.getFullYear()

    let hours = time.getHours()
    let minutes = time.getMinutes()

    if (hours < 10) {
        hours = `0${hours}`
    }

    if (minutes < 10) {
        minutes = `0${minutes}`
    }

    return `${date} ${month[monthIndex]} ${year}`
}

//function start server port
app.listen(port, function () {
    console.log(`server running on PORT ${port}`);
})
