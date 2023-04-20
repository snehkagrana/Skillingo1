////Begining of all the required modules

require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const path = require('path');
const mongoose = require("mongoose"); // mongo DB used to save users's account info
const cors = require("cors");
const passport = require("passport"); // passport-local used for user authentication
const passportLocal = require("passport-local").Strategy;
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");   // used to encrypt user's password
const session = require("express-session");
const bodyParser = require("body-parser");
const User = require("./models/user");
const Skill = require("./models/skill");
const Question = require("./models/question");
const Information = require("./models/information");
const flash = require("express-flash");  
const {authUser, authRole} = require('./middleware')
const multer = require("multer");
const fs = require("fs");


const dbURI ="mongodb+srv://hsureka:EM7oHtZg72LQ8vgd@cluster0.wjqn6ca.mongodb.net/dev";

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  	.then(result => {
    	console.log("Mongoose Is Connected");
    	// server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));
    })
  	.catch(err => console.log(err));

// Middleware
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());


app.use(
    session({
      	secret: "secretcode",
      	resave: true,
      	saveUninitialized: true,
    })
);

app.use(cookieParser("secretcode"));

////Initializing local-passport for user authentication
app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);

// img storage path
const imgconfig = multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,"./uploads")
    },
    filename:(req,file,callback)=>{
        callback(null,`image-${Date.now()}. ${file.originalname}`)
    }
})


// img filter
const isImage = (req,file,callback)=>{
    if(file.mimetype.startsWith("image")){
        callback(null,true)
    }else{
        callback(new Error("only images is allowd"))
    }
}

const upload = multer({
    storage:imgconfig,
    fileFilter:isImage
});

const deleteFile = (fileName) =>{
	if(fileName == "")	return;
	var directoryPath = __dirname ;
	directoryPath = directoryPath.replace('\\', '/')
	directoryPath+= "/uploads/" + fileName;
	
	fs.unlink(directoryPath, (err) => {
		if (err) {
			console.log(err);
		}
		console.log('File deleted!');   
	});
}

app.post("/server/login",  (req, res, next) => { // req is request, res is response	
    passport.authenticate("local", (err, user, info) => {	
      	if (err) throw err;  	
      	if (!user) {	
        	var redir = {  message:"Incorrect Username or Wrong Password"};	
        	return res.json(redir);	
    	}	
      	else {	
        	req.logIn(user, (err) => {	
          		if (err) throw err;	
          		var redir = { redirect: "/home" , message:"Login Successfully" , userName:req.user.username };	
          		///// redir is the redirect information passed to front end react app.	
          		return res.json(redir);	
        	});	
      	}	
    })(req, res, next);	
});

////When login page is requested by the user,	
////we check if user is already logged in or not  	
app.get('/server/login',  (req, res) => {	
    if (req.isAuthenticated()) {	
        var redir = { redirect: "/home" , message:'Already Logged In', user:req.user};	
        return res.json(redir);	
    }	
    else{	
      	var redir = { redirect: "/login", message:'Enter your credentials to Log In' };	
        return res.json(redir);	
    }	
});

app.post("/server/register",  (req, res) => {
    ////checking if another user with same username already exists
    User.findOne({ username: req.body.username }, async (err, doc) => {
      	if (err) throw err;
      	if (doc){ 
	        var redir = {  redirect: "/register", message:"User Already Exists"};
        	return res.json(redir);
    	} 
      	if (!doc) {
        	////username and password is required during creation of an account

        	if(req.body.username.length==0){
          		var redir = {  redirect: "/register", message:"Username cannot be empty"};
          		return res.json(redir);  
        	}
        	if(req.body.password.length==0){
          		var redir = {  redirect: "/register", message:"Password cannot be empty"};
          		return res.json(redir);  
        	}

        	////encryption of password using bcrypt
        	const hashedPassword = await bcrypt.hash(req.body.password, 10);
        	const newUser = new User({
          		username: req.body.username,
          		password: hashedPassword,
				role: "basic"
        	});
        	await newUser.save();
			var redir = { redirect: "/login", message:"User Created"};
        	return res.json(redir);
    	}
    });
});

////Checking if user is already logged in or not	
app.get('/server/register', (req, res) => {	
    if (req.isAuthenticated()) {	
        var redir = { redirect: "/home", message:'Already Registered' };	
        return res.json(redir);	
    }	
    else{	
      	var redir = { redirect: "/register" , message:'Register Now'};	
        return res.json(redir);	
    }	
});

////To get username of the logged in user
app.get("/server/user",authUser, (req, res) => {
    res.send(req.user); // The req.user stores the entire user that has been authenticated inside of it.
});

app.get('/server/logout',authUser,(req, res) => {	
	req.logout(function(err) {
		if (err) { return next(err); }
		console.log("LOGOUT_SUCCESS");
	});   // logOut function by Passport	
	// req.session.destroy();	
	var redir = { redirect: "/" , message:'Logged Out'};	
	return res.status(200).json(redir);	
});	

app.get('/server/skills', authUser,  (req, res) => {	
    Skill.find((err, val) => {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log("All skills", val);
			val.sort((a, b) => {
				return a.order - b.order;
			});
			return res.json({data: val});
		}
	})	
});

app.get('/server/skills/:skillName',authUser,  (req, res) => {	
	var skillName = req.params.skillName;
	Skill.find().where("skill", skillName).exec(function(err, val) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log("Skill id", id);
			return res.json({data: val});
		}
	});
});

app.get('/server/information/:skillName',  authUser,(req, res) => {	
	var skillName = req.params.skillName;
	Information.find().where("skill", skillName).exec(function(err, information) {
		if(err){
			console.log("ERROR", err);
		}else{
			return res.json({data: information});
		}
	 });
});

app.get('/server/information/:skillName/:category/:subcategory/:page', authUser,  (req, res) => {	
	var skillName = req.params.skillName;
	var category = req.params.category;
	var subcategory = req.params.subcategory;
	var page = req.params.page;
	Information.find({skill:skillName, category:category, sub_category:subcategory}).skip(page).limit(1).exec(function(err, information) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log("info for", information[0]);
			return res.json({data: information[0]});
		}
	 });
});

app.get('/server/allinformation/:skill/:category/:subcategory/', authUser,  (req, res) => {	
	var skill = req.params.skill;
	var category = req.params.category;
	var subcategory = req.params.subcategory;
	Information.find({skill:skill, category:category, sub_category:subcategory}).exec(function(err, information) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log("all info for", information);
			return res.json({data: information});
		}
	 });
});

app.get('/server/question/:id', authUser, (req, res) => {	
	var id = req.params.id;
	Question.findById(id, function(err, question) {
		if(err){
			console.log("ERROR", err);
		}else{
			return res.json({data: question});
		}
	 });
});

app.get('/server/informationById/:id', authUser, (req, res) => {	
	var id = req.params.id;
	Information.findById(id, function(err, information) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log("INFO", information);
			return res.json({data: information});
		}
	 });
});

app.post('/server/editquestion/:id', authUser, (req, res) => {	
	var id = req.params.id;
	// console.log('edited question', req.body);
	Question.findById(id, async function(err, question) {
		if(err){
			console.log("ERROR", err);
		}else{
			optionsList = req.body.options;
			var options = [];
			optionsList.forEach(element => {
				options.push(element.option);
			});
			await Question.updateOne({_id: id},{$set:{question: req.body.question,
				options: options,
				correct_answers: req.body.correct_answers,
				explaination: req.body.explaination}} )
		}
	 });
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/editinformation/:id', authUser, (req, res) => {	
	var id = req.params.id;
	Information.findById(id, async function(err, question) {
		if(err){
			console.log("ERROR", err);
		}else{
			await Information.updateOne({_id: id},{$set:{heading: req.body.heading,
				information: req.body.information}} )
		}
	 });
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/deletesubcategory/:skill/:category/:subcategory', authUser, (req, res) => {
	var skill = req.params.skill;
	var category = req.params.category;
	var subcategory = req.params.subcategory;
	
	Information.find({skill:skill, category:category, sub_category:subcategory }).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log('info before del', informationList);
			informationList.forEach(async (info) => {
				await Information.deleteOne({_id: info._id});
				deleteFile(info.imgpath);
			});
		}
	});

	Question.find({skill:skill, category:category, sub_category:subcategory}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.deleteOne({_id: question._id});
				
			});
		}
	});

	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			if(skillData.information !== undefined){
				// console.log('info before del', (skillData.information));
				var updatedInformationList = (skillData.information).filter((info) => info.sub_category !== subcategory);
				await Skill.updateOne({_id: skillData._id},{$set:{information: updatedInformationList}} );
				// console.log('info after del', (updatedInformationList));

			}

			if(skillData.questions !== undefined){
				// console.log('ques before del', (skillData.questions));
				var updatedQuestionList = (skillData.questions).filter(quest => quest.sub_category !== subcategory);
				await Skill.updateOne({_id: skillData._id},{$set:{questions: updatedQuestionList}} );
				// console.log('ques after del', (updatedQuestionList));
			}

			if(skillData.sub_categories !== undefined){
				// console.log('subs before del', (skillData.sub_categories));
				var updatedSubCategoryList = (skillData.sub_categories).filter(subCategory => subCategory.sub_category !== subcategory);
				await Skill.updateOne({_id: skillData._id},{$set:{sub_categories:updatedSubCategoryList }} );
				// console.log('subs after del', (updatedSubCategoryList));
			}
		}
	});

	User.find().exec( function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				var array = (user.score);
				var scoreList = (array).filter(function(score, index, arr){ 
					return (score.sub_category !== subcategory);
				});
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});
	
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/deletecategory/:skill/:category', authUser, (req, res) => {
	var skill = req.params.skill;
	var category = req.params.category;
	
	Information.find({skill:skill, category:category}).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			informationList.forEach(async (info) => {
				await Information.deleteOne({_id: info._id});
				deleteFile(info.imgpath);
			});
		}
	});

	Question.find({skill:skill, category:category}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.deleteOne({_id: question._id});
			});
		}
	});

	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			if(skillData.information !== undefined){
				var updatedInformationList = (skillData.information).filter((info) => info.category !== category);
				await Skill.updateOne({_id: skillData._id},{$set:{information: updatedInformationList}} );
			}

			if(skillData.questions !== undefined){
				var updatedQuestionList = (skillData.questions).filter(quest => quest.category !== category);
				await Skill.updateOne({_id: skillData._id},{$set:{questions: updatedQuestionList}} );
			}

			if(skillData.sub_categories !== undefined){
				var updatedSubCategoryList = (skillData.sub_categories).filter(subCategory => subCategory.category !== category);
				await Skill.updateOne({_id: skillData._id},{$set:{sub_categories:updatedSubCategoryList }} );
			}

			if(skillData.categories !== undefined){
				var updatedCategories = (skillData.categories).filter((categoryElement) => categoryElement !== category);
				await Skill.updateOne({_id: skillData._id},{$set:{categories:updatedCategories }} );
			}
		}
	});

	User.find().exec( function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				var array = (user.score);
				var scoreList = (array).filter(function(score, index, arr){ 
					return (score.category !== category);
				});
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});
	
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/editsubcategory/:skill/:category/:subcategory', authUser, (req, res) => {	
	var skill = req.params.skill;
	var category = req.params.category;
	var subcategory = req.params.subcategory;
	// console.log('edited subcategory', req.body);
	
	Information.find({skill:skill, category:category, sub_category:subcategory}).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			informationList.forEach(async (info) => {
				await Information.updateOne({_id: info._id},{$set:{sub_category:req.body.newSubCategory.split(" ").join("_")}} );
			});
		}
	});

	Question.find({skill:skill, category:category,sub_category:subcategory}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.updateOne({_id: question._id},{$set:{sub_category:req.body.newSubCategory.split(" ").join("_")}} );
			});
		}
	});

	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			if(skillData.information !== undefined){
				// console.log('info before', skillData.information);
				var updatedInformationList = (skillData.information).map(info => {
					if (info.sub_category == subcategory) {
						info.sub_category = req.body.newSubCategory.split(" ").join("_");
					}
					return info;
				});
				// console.log('info after', updatedInformationList);
				await Skill.updateOne({_id: skillData._id},{$set:{information: updatedInformationList}} );
			}

			if(skillData.questions !== undefined){
				var updatedQuestionList = (skillData.questions).map(quest => {
					if (quest.sub_category == subcategory) {
						quest.sub_category = req.body.newSubCategory.split(" ").join("_");
					}
					return quest;
				});
				await Skill.updateOne({_id: skillData._id},{$set:{questions: updatedQuestionList}} );
			}

			if(skillData.sub_categories !== undefined){
				var updatedSubCategoryList = (skillData.sub_categories).map(subCategory => {
					if (subCategory.sub_category == subcategory) {
						subCategory.sub_category = req.body.newSubCategory.split(" ").join("_");
					}
					return subCategory;
				});
				await Skill.updateOne({_id: skillData._id},{$set:{sub_categories:updatedSubCategoryList }} );
			}
		}
	});

	User.find().exec( function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				// console.log('username', user.username);
				// console.log('score before', user.score);
				var scoreList = user.score;
				scoreList.forEach(score => {
					if(score.sub_category == subcategory){
						score.sub_category = req.body.newSubCategory.split(" ").join("_");
					}
					return score;
				});
				// console.log('score after', scoreList);
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});
	
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/editcategory/:skill/:category', authUser, (req, res) => {	
	var skill = req.params.skill;
	var category = req.params.category;
	// console.log('edited category', req.body);
	
	Information.find({skill:skill, category:category}).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			informationList.forEach(async (info) => {
				await Information.updateOne({_id: info._id},{$set:{category:req.body.newCategory.split(" ").join("_")}} );
			});
		}
	});

	Question.find({skill:skill, category:category}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.updateOne({_id: question._id},{$set:{category:req.body.newCategory.split(" ").join("_")}} );
			});
		}
	});

	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			if(skillData.information !== undefined){
				// console.log('info before', skillData.information);
				var updatedInformationList = (skillData.information).map(info => {
					if (info.category == category) {
						info.category = req.body.newCategory.split(" ").join("_");
					}
					return info;
				});
				// console.log('info after', updatedInformationList);
				await Skill.updateOne({_id: skillData._id},{$set:{information: updatedInformationList}} );
			}

			if(skillData.questions !== undefined){
				var updatedQuestionList = (skillData.questions).map(quest => {
					if (quest.category == category) {
						quest.category = req.body.newCategory.split(" ").join("_");
					}
					return quest;
				});
				await Skill.updateOne({_id: skillData._id},{$set:{questions: updatedQuestionList}} );
			}

			if(skillData.categories !== undefined){
				var updatedCategoryList = (skillData.categories).map(categoryElement => {
					if (categoryElement == category) {
						categoryElement = req.body.newCategory.split(" ").join("_");
					}
					return categoryElement;
				});
				await Skill.updateOne({_id: skillData._id},{$set:{categories:updatedCategoryList }} );
			}

			if(skillData.sub_categories !== undefined){
				var updatedSubCategoryList = (skillData.sub_categories).map(subCategory => {
					if (subCategory.category == category) {
						subCategory.category = req.body.newCategory.split(" ").join("_");
					}
					return subCategory;
				});
				await Skill.updateOne({_id: skillData._id},{$set:{sub_categories:updatedSubCategoryList }} );
			}
		}
	});

	User.find().exec( function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				var scoreList = user.score;
				scoreList.forEach(score => {
					if(score.category == category){
						score.category = req.body.newCategory.split(" ").join("_");
					}
					return score;
				});
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});
	
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/editskillordering/:skill', authUser, (req, res) => {
	Skill.find({skill:req.body.skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			await Skill.updateOne({_id: skillData._id},{$set:{order:req.body.order}} );
		}
	});
});

app.post('/server/editcategoryordering/:skill', authUser, (req, res) => {	
	var skill = req.params.skill;
	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			await Skill.updateOne({_id: skillData._id},{$set:{categories:req.body.categories }} );
		}
	});
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/editsubcategoryordering/:skill/:category', authUser, (req, res) => {	
	console.log('req.body.sub_categories', req.body.sub_categories);
	var skill = req.params.skill;
	var category = req.params.category;
	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{

			var updatedSubCategories = skillData.sub_categories;

			console.log('ordered sub categories before', updatedSubCategories);
			var ind=0;
			
			for (var i=0; i<(updatedSubCategories).length; i++){
				if(updatedSubCategories[i].category === category){
					updatedSubCategories[i] = req.body.sub_categories[ind++];
				}
			}

			console.log('ordered sub categories after', updatedSubCategories);

			await Skill.updateOne({_id: skillData._id},{$set:{sub_categories:updatedSubCategories }} );
		}
	});
	var redir = { message:"Success"};
    return res.json(redir);
});


app.post('/server/editskill/:skill', authUser, (req, res) => {	
	var skill = req.params.skill;
	// console.log('edited skill', req.body);
	
	Information.find({skill:skill}).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			informationList.forEach(async (info) => {
				await Information.updateOne({_id: info._id},{$set:{skill:req.body.newSkill.split(" ").join("_")}});
			});
		}
	});

	Question.find({skill:skill}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.updateOne({_id: question._id},{$set:{skill:req.body.newSkill.split(" ").join("_")}});
			});
		}
	});

	Skill.find({skill:skill}).exec(async function(err, skillData) {
		skillData = skillData[0];
		// console.log('edit skilldata', skillData);
		if(err){
			console.log("ERROR", err);
		}else{
			await Skill.updateOne({_id: skillData._id},{$set:{skill:req.body.newSkill.split(" ").join("_") }} );
		}
	});

	User.find().exec( function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				var scoreList = user.score;
				scoreList.forEach(score => {
					if(score.skill == skill){
						score.skill = req.body.newSkill.split(" ").join("_");
					}
					return score;
				});
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});
	
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/deleteskill/:skill', authUser, async (req, res) => {
	var skill = req.params.skill;
	
	Information.find({skill:skill}).exec( function(err, informationList) {
		if(err){
			console.log("ERROR", err);
		}else{
			informationList.forEach(async (info) => {
				await Information.deleteOne({_id: info._id});
				deleteFile(info.imgpath);
			});
		}
	});

	Question.find({skill:skill}).exec( function(err, questionsList) {
		if(err){
			console.log("ERROR", err);
		}else{
			questionsList.forEach(async (question) => {
				await Question.deleteOne({_id: question._id});
			});
		}
	});

	User.find().exec(function(err, usersList) {
		if(err){
			console.log("ERROR", err);
		}else{
			usersList.forEach(async (user) => {
				var array = (user.score);
				var scoreList = (array).filter(function(score, index, arr){ 
					return (score.skill !== skill);
				});
				await User.updateOne({username: user.username},{$set:{score: scoreList}} );
			});
		}
	});

	await Skill.deleteOne({skill: skill});

	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/deletequestion/:id', authUser, async(req, res) => {	
	// console.log('yay delete questi');
	var id = req.params.id;
	await Question.deleteOne({_id:id});
	Skill.findOne({skill: req.body.skill}, async(err, val) => {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log('before', val.questions);
			var updatedQuestionsList = (val.questions).filter((question) => question.question_id.toString() !== id)
			// console.log('after', updatedQuestionsList);
			let updatedDoc = await Skill.updateOne({skill: req.body.skill},{$set:{questions:updatedQuestionsList}} )
			// console.log('updated', updatedDoc);
		}
	});
	var redir = { message:"Success"};
    return res.json(redir);
});

app.post('/server/deleteinformation/:id', authUser, async(req, res) => {	
	// console.log('yay delete info');
	var id = req.params.id;
	const info = await Information.find({_id:id});
	await Information.deleteOne({_id:id});
	// console.log('info d',info);
	// console.log("infoimgpath",info[0].imgpath);
	deleteFile(info[0].imgpath);
	Skill.findOne({skill: req.body.skill}, async(err, val) => {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log('before', val.information);
			var updatedInformationList = (val.information).filter((information) => information.information_id.toString() !== id)
			// console.log('after', updatedInformationList);
			let updatedDoc = await Skill.updateOne({skill: req.body.skill},{$set:{information:updatedInformationList}} )
			// console.log('updated', updatedDoc);
		}
	});
	var redir = { message:"Success"};
    return res.json(redir);
});


app.get('/server/questions/:skillName/:category/:subcategory', authUser, (req, res) => {	
	var skillName = req.params.skillName;
	var category = req.params.category;
	var subcategory = req.params.subcategory;
	Question.find({skill:skillName, category:category, sub_category:subcategory}).exec(function(err, questions) {
		if(err){
			console.log("ERROR", err);
		}else{
			return res.json({data: questions});
		}
	 });
});

app.get('/server/subcategories/:skillName/:categoryName', authUser, (req, res) => {	
	var skillName = req.params.skillName;
	var categoryName = req.params.categoryName;
	Skill.find().where("skill", skillName).exec(function(err, skill) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log('skill rec', skill);
			var subCategories = (skill[0].sub_categories).filter(function (el)
    			{	return el.category === categoryName;});
			// console.log('filtered sub categories', subCategories);
			return res.json({data: subCategories});
		}
	});
});

app.get('/server/categories/:skillName', authUser, (req, res) => {	
	var skillName = req.params.skillName;
	Skill.find().where("skill", skillName).exec(function(err, skill) {
		if(err){
			console.log("ERROR", err);
		}else{
			// console.log('skill rec', skill);
			// console.log('filtered categories', skill[0].categories);
			return res.json({data: skill[0].categories});
		}
	 });
});
app.post("/server/addquestions", authUser, authRole(["admin"]), upload.single("photo"), async(req, res) => {
    ////checking if another user with same username already exists
	var filename = "";
	if(req.file != undefined)	filename = req.file.filename;
	console.log('quest req.body', req.body);
    
	Question.findOne({ question: req.body.question, skill: req.body.corresponding_skill,
		category: req.body.corresponding_category,
		sub_category: req.body.corresponding_sub_category }, async (err, doc) => {
      	if (err) throw err;
      	if (!doc) {
			optionsList = req.body.options;
			var options = optionsList.split(',');

			Skill.findOne({skill: req.body.corresponding_skill}, async(err, val) => {
				if(err){
					console.log("ERROR", err);
				}else{
					let skill_data = val;
					var newQuestion;
					if(filename != ""){
						newQuestion = new Question({
							question: req.body.question,
							options: options,
							correct_answers: req.body.correct_answers,
							explaination: req.body.explaination,
							skill: req.body.corresponding_skill,
							category: req.body.corresponding_category,
							sub_category: req.body.corresponding_sub_category,
							imgpath:filename,
						});
					}
					else{
						newQuestion = new Question({
							question: req.body.question,
							options: options,
							correct_answers: req.body.correct_answers,
							explaination: req.body.explaination,
							skill: req.body.corresponding_skill,
							category: req.body.corresponding_category,
							sub_category: req.body.corresponding_sub_category
						});
					}
		        	await newQuestion.save();
					Skill.findOne({skill: req.body.corresponding_skill}, async(err, val) => {
						if(err){
							console.log("ERROR", err);
						}else{
							let questionsList = val.questions;
							questionsList.push({category: req.body.corresponding_category, sub_category: req.body.corresponding_sub_category, question_id:newQuestion._id});
							let updatedDoc = await Skill.updateOne({skill: req.body.corresponding_skill},{$set:{questions:questionsList}} )
							// console.log('updated', updatedDoc);
						}
					});
				}
			});	
    	}
		var redir = { message:"Success"};
        return res.json(redir);
    });
});

app.post("/server/addinformation", authUser, authRole(["admin"]), upload.single("photo"), async(req, res) => {
    ////checking if another user with same username already exists
	// console.log('info req', req);

	var filename = "";
	if(req.file != undefined)	filename = req.file.filename;
	console.log('info req.body', req.body);
	
    Information.findOne({ information: req.body.information, skill: req.body.corresponding_skill,
		category: req.body.corresponding_category,
		sub_category: req.body.corresponding_sub_category }, async (err, doc) => {
      	if (err) throw err;
      	if (!doc) {
			Skill.findOne({skill: req.body.corresponding_skill}, async(err, val) => {
				if(err){
					console.log("ERROR", err);
				}else{
					let skill_data = val;
					var newInformation;
					if(filename != ""){
						newInformation = new Information({
							heading: req.body.heading,
							information: req.body.information,
							skill: req.body.corresponding_skill,
							category: req.body.corresponding_category,
							sub_category: req.body.corresponding_sub_category,
							imgpath:filename,
						});
					}
					else{
						newInformation = new Information({
							heading: req.body.heading,
							information: req.body.information,
							skill: req.body.corresponding_skill,
							category: req.body.corresponding_category,
							sub_category: req.body.corresponding_sub_category
						});
					}
		        	await newInformation.save();
					Skill.findOne({skill: req.body.corresponding_skill}, async(err, val) => {
						if(err){
							console.log("ERROR", err);
						}else{
							let informationList = val.information;
							informationList.push({category: req.body.corresponding_category, sub_category: req.body.corresponding_sub_category, information_id: newInformation._id});
							let updatedDoc = await Skill.updateOne({skill: req.body.corresponding_skill},{$set:{information:informationList}} )
							// console.log('updated', updatedDoc);
						}
					});
				}
			});	
    	}
		var redir = { message:"Success"};
        return res.json(redir);
    });
});

app.post("/server/addsubcategories", authUser, authRole(["admin"]), (req, res) => {
    ////checking if another user with same username already exists
	// console.log('sub req.body', req.body);
    Skill.findOne({ skill: req.body.skill }, async (err, doc) => {
      	if (err) console.log("ERROR", err);
      	else {
			subCategoriesList = req.body.sub_categories;
			let originalSubCategoriesList = doc.sub_categories;
			// console.log('originalSubCategoriesList before', originalSubCategoriesList);
			subCategoriesList.forEach(element => {
				originalSubCategoriesList.push({category: req.body.category, sub_category: element.sub_category.split(" ").join("_")});
			});
			// console.log('originalSubCategoriesList after', originalSubCategoriesList);
			await Skill.updateOne({skill: req.body.skill},{$set:{sub_categories:originalSubCategoriesList}} )
    	}
		var redir = { message:"Success"};
        return res.json(redir);
    });
});

app.post("/server/addcategories", authUser, authRole(["admin"]), (req, res) => {
    ////checking if another user with same username already exists
    Skill.findOne({ skill: req.body.skill }, async (err, doc) => {
      	if (err) console.log("ERROR", err);
      	else {
			categoriesList = req.body.categories;
			let originalCategoriesList = doc.categories;
			categoriesList.forEach(element => {
				originalCategoriesList.push(element.category.split(" ").join("_"));
			});
			// console.log('categories: ', categories);
			await Skill.updateOne({skill: req.body.skill},{$set:{categories:originalCategoriesList}} )
    	}
		var redir = { message:"Success"};
        return res.json(redir);
    });
});

app.post("/server/addskill", authUser, authRole(["admin"]), (req, res) => {
	Skill.findOne({ skill: req.body.skill }, async (err, doc) => {
		if (err) throw err;
		if (!doc) {
			const newSkill = new Skill({ 
				skill: req.body.skill.split(" ").join("_"),
				order: req.body.order,
			});
			await newSkill.save();
		}
		var redir = { message:"Success"};
		return res.json(redir);
	});
});

app.post("/server/savescore", authUser, (req, res) => {
    ////checking if another user with same username already exists
	// console.log('score req.body', req.body);
    User.findOne({ username: req.user.username }, async (err, doc) => {
      	if (err) {
			console.log("ERROR", err);
		}else{
			let allScoresList = doc.score;
			// console.log('req.body from Quiz', req.body);
			allScoresList.push({skill: req.body.skill, category: req.body.category, sub_category: req.body.sub_category,points: req.body.points});
			let updatedDoc = await User.updateOne({ username: req.user.username },{$set:{score: allScoresList, last_played : {skill: req.body.skill, category: req.body.category, sub_category: req.body.sub_category}}});
			// console.log('updated', updatedDoc);
		}
		// console.log('scored user = ', req.user);
		var redir = { message:"Success"};
        return res.json(redir);
    });
});

app.get("/server/allScoresForUser", authUser, (req, res) => {
    res.send(req.user.score); // The req.user stores the entire user that has been authenticated inside of it.
});

//port
const PORT = 5000 || process.env.PORT;

//listen server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use("/uploads",express.static("./uploads"));

// if(process.env.PROD){
    app.use(express.static(path.join(__dirname, './client/build')));
    app.get('*', (req, res)=>{
        res.sendFile(path.join(__dirname, './client/build/index.html'));
    });
// }

