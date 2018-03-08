var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');

var User = require('../models/user');

module.exports = function(io){
    var counter = 0;
    var usersAvailable = [];
    var onlineUsers = [];
    var token = '';
    io.on('connection', function (socket) {
        socket.on('attendence',function(email){
            if(usersAvailable.indexOf(email)===-1){
                usersAvailable.push(email);
            }
        })
        socket.on('inactive',function(us){
            if(us){
            User.findOne({email:us.email}).exec(function(err,user){
                if(err){
                    console.log(err);
                }
                if(user){
                    user.isOnline = 'away';
                    user.save(function(err,result){
                        if(err){
                            console.log(err);
                        }
                        setTimeout(function(){io.sockets.emit('awayUser')},100);   
                    })
                       
                }
            });
            }
        });
        socket.on('userActive',function(us){
            if(us){
            User.findOne({email:us.email}).exec(function(err,user){
                if(err){
                    console.log(err);
                }
                if(user){
                    user.isOnline = 'yes';
                    user.save(function(err,result){
                        if(err){
                            console.log(err);
                        }
                        setTimeout(function(){io.sockets.emit('loggedUser')},100);   
                    })   
                }
            });
            }
        });
        socket.on('disconnect', function(){
            setTimeout(function(){
                usersAvailable = [];
                User.find({})
                    .exec(function (err, users) {
                        for(var i = 0; i<users.length;i++){
                            io.emit('ping'+users[i].email, users[i].email);
                        }
                        setTimeout(function(){
                            for(var i = 0; i<users.length;i++){
                                if(usersAvailable.indexOf(users[i].email)===-1 && users[i].isOnline != 'no'){
                                    (function(index,user){
                                        user.isOnline = 'no';
                                        user.save(function (err, result) {
                                            if (err) {
                                                console.log('in error while saving');
                                            }
                                            setTimeout(function(){io.sockets.emit('logout')},100);   
                                        });
                                    })(i,users[i]);
                                }
                            }
                        },2000);
                    });
            },5000);
        });
    });
    router.post('/', function (req, res, next) {
        setTimeout(function(){io.sockets.emit('saveUser')},1000);
        var user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: bcrypt.hashSync(req.body.password, 10),
            email: req.body.email
        });
        user.save(function(err, result) {
            if (err) {
                return res.status(500).json({
                    title: 'An error occurred',
                    error: err
                });
            }
            res.status(201).json({
                message: 'User created',
                obj: {
                    firstName: result.firstName,
                    lastName: result.lastName,
                    email: result.email
                }
            });
        });
    });
    router.post('/updateUser', function (req, res, next) {
        console.log('***************************************************************************************************************************************************************************************************************************************');  
        console.log('req.body: ' , req.body);  
        console.log('***************************************************************************************************************************************************************************************************************************************');  
        var decoded = jwt.decode(req.query.token);        
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }
        var updateBody = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city            
        };        
        User.updateOne(
            {"email":req.body.email},
            {$set:updateBody},
            function(err, result) {
            if (err) {
                return res.status(500).json({
                    title: 'An error occurred',
                    error: err
                });
            }
            res.status(200).json({
                message: 'User created',
                obj: result
            });
        });
    });
    router.get('/updateAll',function(req,res,next){
        User.find({})
        .exec(function(err,users){
            if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                for(var i = 0;i<users.length;i++){
                    users[i].isOnline = 'no';
                    users[i].save(function (err, result) {});
                }
            res.status(200).json({
                    message: 'Success',
                    obj: users
                });
        });

    });
    router.post('/deleteBuddy',function(req,res,next){
        console.log('req.body: ' , req.body);        
        var decoded = jwt.decode(req.query.token);        
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }
              
        User.findOne({email:decoded.user.email})
            .exec(function (err, user) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                var buddy = req.body.buddy;
                var index = user.buddies.indexOf(buddy);
                if(index>=0){
                    user.buddies.splice(index, 1);
                }
                user.save(function(err, result) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'Buddy added!!',
                        obj: result
                    });
                });
            });

    });
    router.post('/addBuddy',function(req,res,next){
        console.log('req.body: ' , req.body);        
        var decoded = jwt.decode(req.query.token);        
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }
              
        User.findOne({email:decoded.user.email})
            .exec(function (err, user) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                var buddy = req.body.buddy;
                if(user.buddies.indexOf(buddy)==-1){
                    user.buddies.push(buddy);
                }
                user.save(function(err, result) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'Buddy added!!',
                        obj: result
                    });
                });
            });

    });
    router.get('/getBuddies',function(req,res,next){        
        var decoded = jwt.decode(req.query.token);        
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }        
        User.findOne({email:decoded.user.email})
            .exec(function (err, user) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                User.find({email:{$in: user.buddies}}).select('firstName lastName email isOnline city country -_id')
                .exec(function (err, users) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    // setTimeout(function(){io.sockets.emit('getUserList')},1000);
                    res.status(200).json({
                        message: 'Success',
                        obj: users
                    });
                });
            });
    });
    router.post('/getUsers', function (req, res, next) {
		
		console.log(' in get call req : ' , req.body);
		var searchQuery = {};
		if(req.body){
			if(req.body.firstName){
				searchQuery.firstName = new RegExp(req.body.firstName,'i');
			}
			if(req.body.lastName){
				searchQuery.lastName = new RegExp(req.body.lastName,'i');
			}
			if(req.body.email){
				searchQuery.email = new RegExp(req.body.email,'i');
			}
		}
		console.log('searchQuery : ' ,searchQuery);
        var decoded = jwt.decode(req.query.token);
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }
        User.find(searchQuery).where("email").ne(decoded.user.email).select('firstName lastName email isOnline city country -_id')
            .exec(function (err, users) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                setTimeout(function(){io.sockets.emit('getUserList')},1000);
                res.status(200).json({
                    message: 'Success',
                    obj: users
                });
            });
    });

    router.get('/loggedUser',function(req,res,next){
        var decoded = jwt.decode(req.query.token);
        if(!decoded){
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Invalid Token!'}
            });
        }
        User.findOne({email: decoded.user.email}, function(err, user) {
            if (err) {
                return res.status(500).json({
                    title: 'An error occurred',
                    error: err
                });
            }
            var flag = user.isOnline;
            user.isOnline = 'yes';
            user.save(function (err, result) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                if(flag !== 'yes')
                    setTimeout(function(){io.sockets.emit('loggedUser')},1000);
                res.status(200).json({
                    message: 'Success',
                    obj: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        isOnline: user.isOnline,
                        buddies: user.buddies,
                        city: user.city,
                        country: user.country,
                        state: user.state
                    }
                });
            });
        })
    });

    router.post('/signin', function(req, res, next) {
        User.findOne({email: req.body.email}, function(err, user) {
            if (err) {
                return res.status(500).json({
                    title: 'An error occurred',
                    error: err
                });
            }
            if (!user) {
                return res.status(401).json({
                    title: 'Login failed',
                    error: {message: 'Invalid login credentials'}
                });
            }
            if (!bcrypt.compareSync(req.body.password, user.password)) {
                return res.status(401).json({
                    title: 'Login failed',
                    error: {message: 'Invalid login credentials'}
                });
            }
            user.isOnline = 'yes';
            user.save(function (err, result) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                token = jwt.sign({user: user}, 'secret', {expiresIn: 7200});
                console.log('-------------signed in----------------------');
                io.emit('userActive',user);
                setTimeout(function(){io.sockets.emit('signin')},100);
                res.status(200).json({
                    message: 'Successfully logged in',
                    token: token
                });
            });
        });
    });

    router.post('/logout',function(req,res,next){
        var token = req.query.token;
        jwt.verify(req.query.token, 'secret', function (err, decoded) {
            if (err) {
                return res.status(401).json({
                    title: 'Not Authenticated',
                    error: {message: 'Invalid Token!'}
                });
            }
            User.findOne({email: decoded.user.email}, function(err, user) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                user.isOnline = 'no';
                user.save(function (err, result) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    console.log('-------------signed out----------------------');
                    setTimeout(function(){io.sockets.emit('logout')},100);
                    res.status(200).json({
                        message: 'Successfully logged out'
                    });
                });
            })
        });
    });

    router.use('/', function (req, res, next) {
        setTimeout(function(){io.sockets.emit('payload')},1000);
        var token = req.query.token;
        if(token){
            jwt.verify(req.query.token, 'secret', function (err, decoded) {
                if (err) {
                    return res.status(401).json({
                        title: 'Not Authenticated',
                        error: {message: 'Invalid Token!'}
                    });
                }
                // console.log('decodeddddddddddddddddddddddddddddddddddddddddddddd');
                // console.log(decoded.user);
                // console.log('ssssssssssssssssssssssssssssssssssssssssssssssssssssss');
            });
        }
        console.log('in extra use');
        next();
        // })
    });
    return router;
}


