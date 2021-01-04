var express = require("express");
var app = express();

var formidable = require("express-formidable");
app.use(formidable());

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTokenSecret1234567890";

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];

var mainURL = "http://localhost:3000";

socketIO.on("connection", function (socket) {
	socketID = socket.id;
});

http.listen(3000, function () {
	console.log("Server started at " + mainURL);

	mongoClient.connect("mongodb+srv://hoangtuan1106:hoangtuan1106@cluster0.m6xdn.mongodb.net/test", function (error, client) {
		var database = client.db("travel");
		console.log("Database connected.");
		// Api get
		app.get("/login", function (request, result) {
			result.render("login");
		});
		app.get("/user/:username", function (request, result) {
			database.collection("users").findOne({
				"username": request.params.username
			}, function (error, user) {
				if (user == null) {
					result.send({
						"status": "error",
						"message": "User does not exists"
					});
				} else {
					result.render("userProfile", {
						"user": user
					});
				}
			});
		});
		app.get("/logout", function (request, result) {
			result.redirect("/login");
		});
		app.get("/home", function (request, result) {
			result.render("home");
		});
		app.get("/", function (request, result) {
			result.render("home");
		});
		app.get("/category", function (request, result) {
			result.render("category");
		});
		app.get("/postsaved", function (request, result) {
			result.render("postsaved");
		});
		app.get("/profile", function (request, result) {
			result.render("profile");
		});
		app.get("/tour", function (request, result) {
			result.render("managetour");
		});
		app.get("/setting", function (request, result) {
			result.render("settingprofile");
		});
		app.get("/location", function (request, result) {
			result.render("location");
		});
		app.get("/blog", function (request, result) {
			result.render("blog");
		});
		app.get("/search/:query", function (request, result) {
			var query = request.params.query;
			result.render("search", {
				"query": query
			});
		});
		app.get("/friends",function(request,result){
			result.render("friends");
		});


		// Api post 
		app.post("/login", function (request, result) {
			var email = request.fields.email;
			var password = request.fields.password;
			database.collection("users").findOne({
				"email": email
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Email does not exist"
					});
				} else {
					bcrypt.compare(password, user.password, function (error, isVerify) {
						if (isVerify) {
							var accessToken = jwt.sign({ email: email }, accessTokenSecret);
							database.collection("users").findOneAndUpdate({
								"email": email
							}, {
								$set: {
									"accessToken": accessToken
								}
							}, function (error, data) {
								result.json({
									"status": "success",
									"message": "Login successfully",
									"accessToken": accessToken,
									"profileImage": user.profileImage
								});
							});
						} else {
							result.json({
								"status": "error",
								"message": "Password is not correct"
							});
						}
					});
				}
			});
		});
		app.post("/signup", function (request, result) {
			var name = request.fields.name;
			var username = request.fields.username;
			var email = request.fields.email;
			var password = request.fields.password;
			var gender = request.fields.gender;
			var reset_token = "";

			database.collection("users").findOne({
				$or: [{
					"email": email
				}, {
					"username": username
				}]
			}, function (error, user) {
				if (user == null) {
					bcrypt.hash(password, 10, function (error, hash) {
						database.collection("users").insertOne({
							"name": name,
							"username": username,
							"email": email,
							"password": hash,
							"gender": gender,
							"reset_token": reset_token,
							"profileImage": "",
							"coverPhoto": "",
							"dob": "",
							"city": "",
							"country": "",
							"aboutMe": "",
							"friends": [],
							"pages": [],
							"notifications": [],
							"groups": [],
							"posts": [],
							"tours": []
						}, function (error, data) {
							result.json({
								"status": "success",
								"message": "Signed up successfully. You can login now."
							});
						});
					});
				} else {
					result.json({
						"status": "error",
						"message": "Email or username already exist."
					});
				}
			});
		});
		app.post("/getUser", function (request, result) {
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});
		app.post("/updateProfile", function (request, result) {
			var accessToken = request.fields.accessToken;
			var name = request.fields.name;
			var city = request.fields.city;
			var aboutMe = request.fields.aboutMe;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$set: {
							"name": name,
							"city": city,
							"aboutMe": aboutMe
						}
					}, function (error, data) {
						result.json({
							"status": "status",
							"message": "Profile has been updated."
						});
					});
				}
			});
		});
		app.post("/getNewsfeed", function (request, result) {
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					var ids = [];
					ids.push(user._id);

					database.collection("posts")
					.find({
						"user._id": {
							$in: ids
						}
					})
					.sort({
						"createdAt": -1
					})
					.limit(5)
					.toArray(function (error, data) {
						result.json({
							"status": "success",
							"message": "Record has been fetched",
							"data": data
						});
					});
				}
			});
		});
		app.post("/uploadCoverPhoto", function (request, result) {
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					if (request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")) {

						if (user.coverPhoto != "") {
							fileSystem.unlink(user.coverPhoto, function (error) {
								//
							});
						}

						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"coverPhoto": coverPhoto
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "Cover photo has been updated.",
								data: mainURL + "/" + coverPhoto
							});
						});
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});
		});
		app.post("/uploadProfileImage", function (request, result) {
			var accessToken = request.fields.accessToken;
			var profileImage = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					if (request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")) {

						if (user.profileImage != "") {
							fileSystem.unlink(user.profileImage, function (error) {
								//
							});
						}

						profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
						fileSystem.rename(request.files.profileImage.path, profileImage, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"profileImage": profileImage
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "Profile image has been updated.",
								data: mainURL + "/" + profileImage
							});
						});
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});
		});
		app.post("/search", function (request, result) {
			var query = request.fields.query;
			database.collection("users").find({
				"name": {
					$regex: ".*" + query + ".*",
					$options: "i"
				}
			}).toArray(function (error, data) {
				database.collection("tours").find({
					$or:[
						{
							"diemBatDau":{
								$regex: ".*" + query + ".*",
								$options: "i"
							}
						},
						{
							"diemKetThuc":{
								$regex: ".*" + query + ".*",
								$options: "i"
							}
						}
					]
				})
				.toArray(function(error, tour){
					result.json({
						"status": "success",
						"message": "Record has been fetched",
						"data" : data,
						"tour": tour
					})
				})
			});
		});
		// Api like, share, comment

		app.post("/postReply", function (request, result) {
			var accessToken = request.fields.accessToken;
			var postId = request.fields.postId;
			var commentId = request.fields.commentId;
			var reply = request.fields.reply;
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("posts").findOne({
						"_id": ObjectId(postId)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {

							var replyId = ObjectId();

							database.collection("posts").updateOne({
								$and: [{
									"_id": ObjectId(postId)
								}, {
									"comments._id": ObjectId(commentId)
								}]
							}, {
								$push: {
									"comments.$.replies": {
										"_id": replyId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"username": user.username,
										},
										"reply": reply,
										"createdAt": createdAt
									}
								}
							}, function (error, data) {
								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}, {
										"posts.comments._id": ObjectId(commentId)
									}]
								}, {
									$push: {
										"posts.$.comments.$[i].replies": {
											"_id": replyId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"username": user.username,
											},
											"reply": reply,
											"createdAt": createdAt
										}
									}
								},
								{
									arrayFilters:[{'i._id' : ObjectId(commentId)}]
								});
								database.collection("posts").findOne({
									"_id": ObjectId(postId)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "Reply has been posted.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});

		app.post("/sharePost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var type = "shared";
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"shares": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage
									}
								}
							}, function (error, data) {

								database.collection("posts").insertOne({
									"content": post.content,
									"image": post.image,
									"video": post.video,
									"type": type,
									"createdAt": createdAt,
									"likers": [],
									"comments": [],
									"shares": [],
									"user": {
										"_id": user._id,
										"name": user.name,
										"gender": user.gender,
										"profileImage": user.profileImage
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$push: {
											"posts.$[].shares": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage
											}
										}
									});

									result.json({
										"status": "success",
										"message": "Post has been shared."
									});
								});
							});
						}
					});
				}
			});
		});

		//

		app.post("/acceptFriendRequest", function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken":accessToken
			}, function(error,user){
				if(user == null){
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				}else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error,user){
						if (user ==null){
							result.json({
								"status":"error",
								"message":"User does not exist."
							});
						}else{
							database.collection("users").updateOne({
								"_id":ObjectId(_id)
							},{
								$push:{
									"notification":{
										"_id": ObjectId(),
										"type":"friend_request_accepted",
										"content":me.name + " accepted your friend request.",
										"profileImage": me.profileImage,
										"createdAt": new Date().getTime()
									}
								}
							});
							database.collection("users").updateOne({
								$and: [{
									"_id":ObjectId(_id)
								},{
									"friends._id":me._id
								}]
							},{
								$set: {
									"friends.$.status":"Accepted"
								}
							}, function (error,data){
								database.collection("users").updateOne({
									$and:[{
										"_id":me._id
									},{
										"friends._id": user._id
									}]
								},{
									$set:{
										"friends.$.status":"Accepted"
									}
								}, function(error, data){
									result.json({
										"status":"success",
										"message":"Friend request has been accepted."
									});
								});
							});
						}
					});
				}
			});
		});
		app.post("/unfriend", function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken":accessToken
			}, function(error,user){
				if(user == null){
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				}else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error,user){
						if (user ==null){
							result.json({
								"status":"error",
								"message":"User does not exist."
							});
						}else{
							database.collection("users").updateOne({
								"_id":ObjectId(_id)
							},{
								$pull: {
									"friends":{
										"_id": me._id
									}
								}
							}, function (error,data){
								database.collection("users").updateOne({
									"_id":me._id
								},{
									$pull: {
										"friends":{
											"_id": user._id
										}
									}
								}, function(error,data){
									result.json({
										"status":"success",
										"message":"Friend has been removed."
									});
								});
							});
						}
					});
				}
			});
		});

		//

		app.get("/inbox",function(request,result){
			result.render("inbox");
		});
		app.post("/getFriendsChat",function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null){
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				}else {
					var index = user.friends.findIndex(function(friend){
						return friend._id == _id
					});
					var inbox = user.friends[index].inbox;
		
					result.json({
						"status":"success",
						"message":"Record has been fetched",
						"data":inbox
					});
				}
			});
		});
		app.post("/sendMessage", function (request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var message = request.fields.message;
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function (error, user){
						if (user == null) {
							result.json({
								"status":"error",
								"message" : "User does not exist."
							});
						} else {
							database.collection("users").updateOne({
								$and: [{
									"_id": ObjectId(_id)
								},{
									"friends._id": me._id
								}]
							},{
								$push: {
									"friends.$.inbox": {
										"_id": ObjectId(),
										"message":message,
										"from":me._id
									}
								}
							}, function (error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": me._id
									},{
										"friends._id": user._id
									}]
								},{
									$push: {
										"friends.$.inbox":{
											"_id": ObjectId(),
											"message": message,
											"from": me._id
										}
									}
								}, function (error, data){
									socketIO.to(users[user._id]).emit("messageReceived",{
										"message":message,
										"from": me._id
									});
									result.json({
										"status":"success",
										"message":"Message has been sent"
									});
								});
							});
						}
					});
				}				
			});
		});
		app.post("/connectSocket", function (request,result){
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken":accessToken
			}, function(error,user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				}else {
					users[user._id] = socketID;
					result.json({
						"status":"status",
						"message":"Socket has been connected."
					});
				}				
			});
		});

		//

		app.get("/createGroup", function (request, result){
			result.render("createGroup");
		});
		app.post("/createGroup",function (request, result){
			 
			var accessToken = request.fields.accessToken;
			var name = request.fields.name;
			var additionalInfo = request.fields.additionalInfo;
			var coverPhoto = "";
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				} else {
					if (request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")){
						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function (error){
							//
						});
						database.collection("groups").insertOne({
							"name": name,
							"additionalInfo": additionalInfo,
							"coverPhoto": coverPhoto,
							"members": [{
								"_id": user._id,
								"name": user.name,
								"profileImage": user.profileImage,
								"status":"Accepted"
							}],
							"user": {
								"_id":user._id,
								"name":user.name,
								"profileImage":user.profileImage
							}	
						},function (error,data){
							database.collection("users").updateOne({
								"accessToken":accessToken
							},{
								$push:{
									"groups":{
										"_id":data.insertedId,
										"name":name,
										"coverPhoto":coverPhoto,
										"status":"Accepted"
									}
								}
							}, function (error, data){
								result.json({
									"status":"success",
									"message":"Group has been created."
								});
							});
						});
					} else {
						result.json({
							"status":"error",
							"message":"Please select a cover photo."
						});
					}
				}				
			});
		});
		app.get("/groups", function(request,result){
			result.render("group");
		});
		app.post("/getGroups",function (request, result){
			 
			var accessToken = request.fields.accessToken;
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				} else{
		
					database.collection("groups").find({
						$or: [{
							"user._id": user._id
						}, {
							"members._id": user._id
						}]
					}).toArray(function(error,data){
		
						result.json({
							"status":"success",
							"message":"Record has been fetched.",
							"data": data
						});
					});
				}
			});
		});
		
		app.get("/group/:_id", function (request,result){
			var _id = request.params._id;
		
			database.collection("groups").findOne({
				"_id": ObjectId(_id)
			}, function(error, group){
				if (group == null) {
					result.json({
						"status":"error",
						"message":"Group does not exist."
					});
				} else {
					result.render("singleGroup",{
						"_id": _id
					});
				}
			});
		});
		app.post("/getGroupDetail",function(request,result){
			var _id = request.fields._id;
		
			database.collection("groups").findOne({
				"_id": ObjectId(_id)
			}, function (error,group){
				if(group == null) {
					result.json({
						"status":"error",
						"message":"Group does not exist."
					});
				} else {
		
					database.collection("posts").find({
						$and: [{
							"user._id": group._id
						},{
							"type": "group_post"
						}]
					}).toArray(function (error,posts){
		
						result.json({
							"status":"success",
							"message":"Record has been fetched.",
							"data": group,
							"posts":posts
						});
					});
				}
			});
		});
		app.post("/addPost", function (request, result) {
		
			var accessToken = request.fields.accessToken;
			var caption = request.fields.caption;
			var content = request.fields.content;
			var image = "";
			var video = "";
			var type = request.fields.type;
			var createdAt = new Date().getTime();
			var _id = request.fields._id;
		
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
		
					if (request.files.image.size > 0 && request.files.image.type.includes("image")) {
						image = "public/images/" + new Date().getTime() + "-" + request.files.image.name;
						fileSystem.rename(request.files.image.path, image, function (error) {
							//
						});
					}
		
					if (request.files.video.size > 0 && request.files.video.type.includes("video")) {
						video = "public/videos/" + new Date().getTime() + "-" + request.files.video.name;
						fileSystem.rename(request.files.video.path, video, function (error) {
							//
						});
					}
					if(type=="group_post"){
						database.collection("groups").findOne({
							"_id": ObjectId(_id)
						}, function(error,group){
							if (group==null){
								result.json({
									"status":"error",
									"message": "Group does not exist."
								});
								return;
							} else {
								database.collection("posts").insertOne({
									"caption":caption,
									"content": content,
									"image":image,
									"video":video,
									"type": type,
									"createdAt": createdAt,
									"likers":[],
									"comments":[],
									"shares":[],
									"user":{
										"_id":group._id,
										"name":group.name,
										"profileImage": group.coverPhoto
									},
									"uploader": {
										"_id":user._id,
										"name":user.name,
										"profileImage":user.profileImage
									}
								}, function(error,data){
									result.json({
										"status":"success",
										"message":"Post has been uploaded"
									});
								});
							}
						 });
					}
					else {
						database.collection("posts").insertOne({
							"caption": caption,
							"content": content,
							"image": image,
							"video": video,
							"type": type,
							"createdAt": createdAt,
							"likers": [],
							"comments": [],
							"shares": [],
							"user": {
								"_id": user._id,
								"name": user.name,
								"username": user.username,
								"profileImage": user.profileImage
							}
						}, function (error, data) {
							database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$push: {
									"posts": {
										"_id": data.insertedId,
										"caption": caption,
										"content": content,
										"image": image,
										"video": video,
										"type": type,
										"createdAt": createdAt,
										"likers": [],
										"comments": [],
										"shares": []
									}
								}
							}, function (error, data) {
		
								result.json({
									"status": "success",
									"message": "Post has been uploaded."
								});
							});
						});
					}
				}
			});
		});
		app.post("/toggleJoinGroup", function (request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
	
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error,user){
				if(user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				}else{
					database.collection("groups").findOne({
						"_id":ObjectId(_id)
					}, function (error,group){
						if ( group == null) {
							result.json({
								"status":"error",
								"message":"Group does not exist."
							});
						}else{
							var isMember = false;
							for (var a=0;a<group.members.length;a++){
								var member = group.members[a];
		
								if(member._id.toString()==user._id.toString()){
									isMember = true;
									break;
								}
							}
							if (isMember) {
								database.collection("groups").updateOne({
									"_id": ObjectId(_id)},{
										$pull:{
											"members":{
												"_id":user._id,
											}
										}
									}, function (error,data){
										database.collection("users").updateOne({
											"accessToken":accessToken},{
												$pull:{
													"groups":{
														"_id":ObjectId(_id)
													}
												}
											}, function (error,data){
												result.json({
													"status":"leaved",
													"message":"Group has been left."
												});
											});
									});
							} else {
								database.collection("groups").updateOne({
									"_id":ObjectId(_id)
								},{
									$push:{
										"members":{
											"_id":user._id,
											"name":user.name,
											"profileImage": user.profileImage,
											"status":"Pending"
										}
									}
								}, function (error,data) {
									database.collection("users").updateOne({
										"accessToken":accessToken
									},{
										$push:{
											"groups":{
												"_id":group._id,
												"name":group.name,
												"coverPhoto":group.coverPhoto,
												"status":"Pending"
											}
										}
									}, function (error,data){
										database.collection("users").updateOne({
											"_id":group.user._id
										},{
											$push: {
												"notifications":{
													"_id":ObjectId(),
													"type":"group_join_request",
													"content":user.name +"sent a request to join your group.",
													"profileImage": user.profileImage,
													"groupId": group._id,
													"userId":user._id,
													"status":"Pending",
													"createAt": new Date().getTime()
												}
											}
										});
										result.json({
											"status":"success",
											"message":"Request to join group has been sent."
										});
									});
								});
							}				 
						}
					});
				}
			});
		});

		app.get("/getAllPosts",function(request,result){
			database.collection("posts")
			.find()
			.sort({
				"createdAt": -1
			})
			.toArray(function(error,data){
				result.json({
					"status":"success",
					"message":"Record has been fetched",
					"data": data
				});
			});
		});
		app.get("/notifications",function(request,result){
			result.render("notifications");
		});
		app.post("/markNotificationsAsRead", function (request, result) {
			var accessToken = request.fields.accessToken;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("users").updateMany({
						$and: [{
							"accessToken": accessToken
						}, {
							"notifications.isRead": false
						}]
					}, {
						$set: {
							"notifications.$.isRead": true
						}
					}, function (error, data) {
						result.json({
							"status": "success",
							"message": "Notifications has been marked as read."
						});
					});
				}
			});
		});
		app.post("/acceptRequestJoinGroup", function (request, result) {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var groupId = request.fields.groupId;
			var userId = request.fields.userId;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("groups").findOne({
						"_id": ObjectId(groupId)
					}, function (error, group) {
						if (group == null) {
							result.json({
								"status": "error",
								"message": "Group does not exist."
							});
						}
						else {
							if (group.user._id.toString() != user._id.toString()) {
								result.json({
									"status": "error",
									"message": "Sorry, you are not an admin of this group."
								});
								return;
							}
							database.collection("groups").updateOne({
								$and: [{
									"_id": group._id
								}, {
									"members._id": ObjectId(userId)
								}]
							}, {
								$set: {
									"members.$.status": "Accepted"
								}
							}, function (error, data) {
								database.collection("users").updateOne({
									$and: [{
										"accessToken": accessToken
									}, {
										"notifications.groupId": group._id
									}]
								}, {
									$set: {
										"notifications.$.status": "Accepted"
									}
								}, function (error, data) {
									database.collection("users").updateOne({
										$and: [{
											"_id": ObjectId(userId)
										}, {
											"groups._id": group._id
										}]
									}, {
										$set: {
											"groups.$.status": "Accepted"
										}
									}, function (error, data) {
										result.json({
											"status": "success",
											"message": "Group join request has been accepted."
										});
									});
								});
							});
						}
					});
				}
			});
		});
		app.post("/rejectRequestJoinGroup", function (request, result) {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var groupId = request.fields.groupId;
			var userId = request.fields.userId;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("groups").findOne({
						"_id": ObjectId(groupId)
					}, function (error, group) {
						if (group == null) {
							result.json({
								"status": "error",
								"message": "Group does not exist."
							});
						}
						else {
							if (group.user._id.toString() != user._id.toString()) {
								result.json({
									"status": "error",
									"message": "Sorry, you are not an admin of this group."
								});
								return;
							}
							database.collection("groups").updateOne({
								"_id": group._id
							}, {
								$pull: {
									"members": {
										"_id": ObjectId(userId)
									}
								}
							}, function (error, data) {
								database.collection("users").updateOne({
									"accessToken": accessToken
								}, {
									$pull: {
										"notifications": {
											"groupId": group._id
										}
									}
								}, function (error, data) {
									database.collection("users").updateOne({
										"_id": ObjectId(userId)
									}, {
										$pull: {
											"groups": {
												"_id": group._id
											}
										}
									}, function (error, data) {
										result.json({
											"status": "success",
											"message": "Group join request has been rejected."
										});
									});
								});
							});
						}
					});
				}
			});
		});

		app.post("/savePost",function(request,result){
			var accessToken = request.fields.accessToken;
			var postId = request.fields._id;
			var createdAt = new Date().getTime();
			var caption = request.fields.caption;
			var content = request.fields.content;
			var image = request.fields.image;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error,user){
				if (user == null){
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				}else{
					database.collection("savePosts").insertOne({
						"postId": postId,
						"caption":caption,
						"content": content,
						"image": image,
						"createdAt": createdAt,
						"user": {
							"_id": user._id,
							"name": user.name,
							"username": user.username,
							"profileImage": user.profileImage
						}
					}, function (error, data) {
						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$push: {
								"savePosts": {
									"_id": data.insertedId,
									"postId": postId,
									"caption":caption,
									"content": content,
									"image": image,
									"createdAt": createdAt,
								}
							}
						}, function (error, data) {
							result.json({
								"status": "success",
								"message": "Post has been saved."
							});
						});
					});
				}
			});
		});
		app.post("/showSavePost",function(request,result){
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					var ids = [];
					ids.push(user._id);

					database.collection("savePosts")
					.find({
						"user._id": {
							$in: ids
						}
					})
					.sort({
						"createdAt": -1
					})
					.limit(10)
					.toArray(function (error, data) {
						result.json({
							"status": "success",
							"message": "Record has been fetched",
							"data": data
						});
					});
				}
			});
		});
		// Tour
		app.post("/createTour",function (request, result){
			 
			var accessToken = request.fields.accessToken;
			var tenChuyenDi = request.fields.tenChuyenDi;
			var diemBatDau = request.fields.diemBatDau;
			var diemKetThuc = request.fields.diemKetThuc;
			var thoiGianBatDau = request.fields.thoiGianBatDau;
			var thoiGianKetThuc = request.fields.thoiGianKetThuc;
			var phuongTien = request.fields.phuongTien;
			var chiPhi = request.fields.chiPhi;
			var soLuongThanhVien = request.fields.soLuongThanhVien;
			var trangthai = "con_slot";
			var image = "";
			var ghiChu = "";
			var inbox = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				} else {
					if (request.files.image.size > 0 && request.files.image.type.includes("image")) {
						image = "public/images/" + new Date().getTime() + "-" + request.files.image.name;
						fileSystem.rename(request.files.image.path, image, function (error) {

						});
					}
					database.collection("tours").insertOne({
						"tenChuyenDi": tenChuyenDi,
						"image": image,
						"diemBatDau": diemBatDau,
						"diemKetThuc": diemKetThuc,
						"thoiGianBatDau": thoiGianBatDau,
						"thoiGianKetThuc": thoiGianKetThuc,
						"phuongTien": phuongTien,
						"chiPhi":chiPhi,
						"soLuongThanhVien": soLuongThanhVien,
						"trangthai":trangthai,
						"ghiChu":ghiChu,
						"members": [{
							"_id": user._id,
							"name": user.name,
							"profileImage": user.profileImage,
							"status":"Accepted"
						}],
						"user": {
							"_id":user._id,
							"name":user.name,
							"profileImage":user.profileImage
						},
						"inbox":[],
					},function (error,data){
						database.collection("users").updateOne({
							"accessToken":accessToken
						},{
							$push:{
								"tours":{
									"_id":data.insertedId,
									"status":"Accepted"
								}
							}
						}, function (error, data){
							result.json({
								"status":"success",
								"message":"Tour has been created."
							});
						});
					});
				} 
			});				
		});
		app.post("/getTours",function (request, result){
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				} else{
					database.collection("tours").find({
						"trangthai": "con_slot"
					}).toArray(function(error,data){
						result.json({
							"status":"success",
							"message":"Record has been fetched.",
							"data": data
						});
					});
				}
			});
		});
		app.get("/tour/:_id", function (request,result){
			var _id = request.params._id;

			database.collection("tours").findOne({
				"_id": ObjectId(_id)
			}, function(error, tour){
				if (tour == null) {
					result.json({
						"status":"error",
						"message":"Tour does not exist."
					});
				} else {
					result.render("tourDetail",{
						"tour": tour
					});
				}
			});
		});
		app.get("/tourrequest/:_id", function (request,result){
			var _id = request.params._id;

			database.collection("tours").findOne({
				"_id": ObjectId(_id)
			}, function(error, tour){
				if (tour == null) {
					result.json({
						"status":"error",
						"message":"Tour does not exist."
					});
				} else {
					result.render("inviteTour",{
						"tour": tour
					});
				}
			});
		});
		app.get("/post/:id", function (request, result) {
			database.collection("posts").findOne({
				"_id": ObjectId(request.params.id)
			}, function (error, post) {
				if (post == null) {
					result.send({
						"status": "error",
						"message": "Post does not exist."
					});
				} else {
					result.render("postDetail", {
						"post": post
					});
				}
			});
		});

		app.post("/deletePost",function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function(error,post){
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist"
							});
						} else if (post.type == "group_post"){
							if(user._id.toString() == post.uploader._id.toString()){
								database.collection("posts").deleteOne({
									"_id":ObjectId(_id)
								},function(error,data){
									result.json({
										"status": "success",
										"message": "Post has been remove."
									});
								});						
							}else {
								result.json({
									"status": "error",
									"message": "You doesn't own post."
								});
							}
						} else {
							if(user._id.toString() == post.user._id.toString()){
								database.collection("posts").deleteOne({
									"_id":ObjectId(_id)
								},function(error,data){
									database.collection("users").updateOne({
										"_id":user._id
									},{
										$pull:{
											"posts":{
												"_id": post._id
											}	
										}
									},function(error,data){
										result.json({
											"status": "success",
											"message": "Post has been remove."
										});
									});
								});						
							}else {
								result.json({
									"status": "error",
									"message": "You doesn't own post."
								});
							}			
						}
					});
				}
			});
		});
		app.post("/getMyTour",function(request,result){
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken":accessToken
			},function(error,user){
				if(user==null){
					result.json({
						"status":"error",
						"message":"User has been logout. Please login again."
					});
				} else{
					database.collection("tours").find({
						"members._id": user._id
					}).toArray(function(error,tour){
						result.json({
							"status":"success",
							"data":tour
						});
					});
				}
			});
		});
		app.post("/note",function(request,result){
			var ghiChu = request.fields.ghiChu;
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken":accessToken
			},function(error,user){
				if (user==null){
					result.json({
						"status":"error",
						"message":"User has been logout. Please login again."
					});
				} else {
					database.collection("tours").findOne({
						"_id":ObjectId(_id)
					},function(error,tour){
						if(tour.user._id.toString()==user._id.toString()){
							database.collection("tours").updateOne({
								"_id": tour._id
							},{
								$set:{
									"ghiChu":ghiChu
								}
							},function(error,data){
								result.json({
									"status":"success",
									"message":"Data has been fetched."
								});
							});
						} else {
							result.json({
								"status":"error",
								"message":"you does not own tour"
							});
						}
					});
				}
			});
		});
		app.post("/lichTrinh",function(request,result){
			var accessToken = request.fields.accessToken;
			var lichtrinh = request.fields.lichtrinh;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken":accessToken
			},function(error,user){
				if (user == null){
					result.json({
						"status":"error",
						"message":"User has been logout. Please login aagain."
					});
				} else {
					database.collection("tours").findOne({
						"_id":ObjectId(_id)
					}, function(error,tour){
						if (tour.user._id.toString()==user._id.toString()){
							database.collection("tours").updateOne({
								"_id": tour._id
							},{
								$set:{
									"lichTrinh": lichtrinh
								}
							},function(error,data){
								result.json({
									"status":"success",
									"message":"Data has been fetched."
								});
							});
						} else {
							result.json({
								"status":"error",
								"message":"You does not own this tour."
							});
						}
					});
				}
			});
		});

		app.post("/toggleJoinTour", function (request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error,user){
				if(user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				}else{
					database.collection("tours").findOne({
						"_id": ObjectId(_id)
					}, function (error,tour){
						if ( tour == null) {
							result.json({
								"status":"error",
								"message":"Tour does not exist."
							});
						}else{
							var isMember = false;
							for (var a=0;a <tour.members.length;a++){
								var member = tour.members[a];

								if(member._id.toString()==user._id.toString()){
									isMember = true;
									break;
								}
							}
							if (isMember) {
								database.collection("tours").updateOne({
									"_id": ObjectId(_id)},{
										$pull:{
											"members":{
												"_id": user._id,
											}
										}
									}, function (error,data){
										database.collection("users").updateOne({
											"accessToken":accessToken},{
												$pull:{
													"tours":{
														"_id":ObjectId(_id)
													}
												}
											}, function (error,data){
												result.json({
													"status":"leaved",
													"message":"Tour has been left."
												});
											});
									});
							} else {
								database.collection("tours").updateOne({
									"_id":ObjectId(_id)
								},{
									$push:{
										"members":{
											"_id":user._id,
											"name":user.name,
											"profileImage": user.profileImage,
											"status":"Pending"
										}
									}
								}, function (error,data) {
									database.collection("users").updateOne({
										"accessToken":accessToken
									},{
										$push:{
											"tours":{
												"_id":tour._id,
												"name":tour.tenChuyenDi,
												"status":"Pending"
											}
										}
									}, function (error,data){
										database.collection("users").updateOne({
											"_id":tour.user._id
										},{
											$push: {
												"notifications":{
													"_id":ObjectId(),
													"type":"tour_join_request",
													"content":user.name +"sent a request to join your tour.",
													"profileImage": user.profileImage,
													"tourId": tour._id,
													"userId":user._id,
													"status":"Pending",
													"createAt": new Date().getTime()
												}
											}
										});
										result.json({
											"status":"success",
											"message":"Request to join tour has been sent."
										});
									});
								});
							}				 
						}
					});
				}
			});
		});
		app.post("/acceptRequestJoinTour",function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var tourId = request.fields.tourId;
			// var userId = request.fields.userId;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
					
				} else {
					database.collection("tours").findOne({
						"_id": ObjectId(tourId)
					},function (error,tour){
						if (tour == null) {
							result.json({
								"status":"error",
								"message":"Tour does not exist."
							});
						} else {
							if (tour.user._id.toString()!= user._id.toString()){
								result.json({
									"status":"error",
									"message":"Sorry, you do not own this tour."
								});
								return;
							}

							database.collection("tours").updateOne({
								$and: [{
									"_id": tour._id
								}, {
									"members._id": ObjectId(_id)
								}]
							},{
								$set: {
									"members.$.status":"Accepted"
								}
							},function (error,data){
								database.collection("tours").updateOne({
									$and: [{
										"accessToken":accessToken
									},{
										"notifications.tourId": tour._id
									}]
								},{
									$set: {
										"notifications.$.status":"Accepted"
									}
								}, function (error,data){
									database.collection("users").updateOne({
										$and: [{
											"_id": ObjectId(_id)
										},{
											"tours._id":tour._id
										}]
									},{
										$set:{
											"tours.$.status": "Accepted"
										}
									}, function (error,data){
										result.json({
											"status":"success",
											"message":"Tour join request has been accepted."
										});
									});
								});
							});
						}
					});
				}
			});
		});
		app.post("/rejectRequestJoinTour", function(request, result){
	
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var tourId = request.fields.tourId;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error,user){
				if (user == null){
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});

				}else{
					database.collection("tours").findOne({
						"_id":ObjectId(tourId)
					},function(error,tour){
						if(tour==null){
							result.json({
								"status":"error",
								"message":"Tour does not exist."
							});
						} else {
							if (tour.user._id.toString()!= user._id.toString()){
								result.json({
									"status":"error",
									"message":"Sorry,you do not own this tour."
								});
								return;
							}
							database.collection("tours").updateOne({
								"_id": tour._id
							},{
								$pull: {
									"members":{
										"_id": ObjectId(_id)
									}
								}
							}, function(error,data){
								database.collection("users").updateOne({
									"accessToken":accessToken
								},{
									$pull:{
										"notifications":{
											"tourId": tour._id
										}
									}
								}, function (error, data){
									database.collection("users").updateOne({
										"_id": ObjectId(_id)
									},{
										$pull:{
											"tours":{
												"_id":tour._id
											}
										}
									}, function(error,data){
										result.json({
											"status":"success",
											"message":"Tour join reject has been rejected."
										});
									});
								});
							});
						}
					});
				}
			});
		});

		app.post("/getrandomTours",function (request, result){
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message":"User has been logged out. Please login again."
					});
				} else{
					database.collection("tours").aggregate([{ $sample: { size: 5 } }]).toArray(function(error,data){
						result.json({
							"status":"success",
							"message":"Record has been fetched.",
							"data": data
						});
					});
				}
			});
		});

		// 
		app.post("/toggleLikePost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var type = request.fields.type;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {
							var isLiked = false;
							for (var a = 0; a < post.likers.length; a++) {
								var liker = post.likers[a];
								if (liker._id.toString() == user._id.toString()) {
									isLiked = true;
									break;
								}
							}
							if (isLiked) {
								database.collection("posts").updateOne({
									"_id": ObjectId(_id)
								}, {
									$pull: {
										"likers": {
											"_id": user._id,
										}
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$pull: {
											"posts.$[].likers": {
												"_id": user._id,
											}
										}
									});

									result.json({
										"status": "unliked",
										"message": "Post has been unliked."
									});
								});
							} else {
								if(type=="groups_post"){
									database.collection("users").updateOne({
										"_id": post.uploader._id
									}, {
										$push: {
											"notifications": {
												"_id": ObjectId(),
												"type": "photo_liked",
												"content": user.name + " has liked your post.",
												"profileImage": user.profileImage,
												"isRead": false,
												"post": {
													"_id": post._id
												},
												"createdAt": new Date().getTime()
											}
										}
									});
								}else{
									database.collection("users").updateOne({
										"_id": post.user._id
									}, {
										$push: {
											"notifications": {
												"_id": ObjectId(),
												"type": "photo_liked",
												"content": user.name + " has liked your post.",
												"profileImage": user.profileImage,
												"isRead": false,
												"post": {
													"_id": post._id
												},
												"createdAt": new Date().getTime()
											}
										}
									});
								}
								database.collection("posts").updateOne({
									"_id": ObjectId(_id)
								}, {
									$push: {
										"likers": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$push: {
											"posts.$[].likers": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage
											}
										}
									});

									result.json({
										"status": "success",
										"message": "Post has been liked."
									});
								});
							}

						}
					});

				}
			});
		});
		app.post("/postComment", function (request, result) {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var comment = request.fields.comment;
			var createdAt = new Date().getTime();
			var type = request.fields.type;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {
							var commentId = ObjectId();
							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"comments": {
										"_id": commentId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"username": user.username,
										},
										"comment": comment,
										"createdAt": createdAt,
										"replies": []
									}
								}
							}, function (error, data) {
								if (user._id.toString() != post.user._id.toString()) {
									if(type=="group_post"){
										database.collection("users").updateOne({
											"_id": post.uploader._id
										}, {
											$push: {
												"notifications": {
													"_id": ObjectId(),
													"type": "new_comment",
													"content": user.name + " commented on your post.",
													"profileImage": user.profileImage,
													"post": {
														"_id": post._id
													},
													"isRead": false,
													"createdAt": new Date().getTime()
												}
											}
										});
									}else{
										database.collection("users").updateOne({
											"_id": post.user._id
										}, {
											$push: {
												"notifications": {
													"_id": ObjectId(),
													"type": "new_comment",
													"content": user.name + " commented on your post.",
													"profileImage": user.profileImage,
													"post": {
														"_id": post._id
													},
													"isRead": false,
													"createdAt": new Date().getTime()
												}
											}
										});
									}	
								}
								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$push: {
										"posts.$.comments": {
											"_id": commentId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"username": user.username,
												"profileImage": user.profileImage,
											},
											"comment": comment,
											"createdAt": createdAt,
											"replies": []
										}
									}
								});

								database.collection("posts").findOne({
									"_id": ObjectId(_id)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "Comment has been posted.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});
		app.post("/sendFriendRequest", function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error,user){
				if (user == null) {
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id":ObjectId(_id)
					}, function(error,user){
						if (user == null){
							result.json({
								"status":"error",
								"message":"User does not exit"
							});
						} else {
							database.collection("users").updateOne({
								"_id":ObjectId(_id)
							}, {
								$push: {
									"friends": {
										"_id":me._id,
										"name": me.name,
										"username": me.username,
										"profileImage":me.profileImage,
										"status":"Pending",
										"sentByMe": false,
										"inbox": []
									}
								}
							}, function(error,data){
								database.collection("users").updateOne({
									"_id":me._id
								},{
									$push:{
										"friends": {
											"_id": user._id,
											"name": user.name,
											"username": user.username,
											"profileImage": user.profileImage,
											"status":"Pending",
											"sentByMe":true,
											"inbox":[]
										}
									}
								}, function(error,data){
									database.collection("users").updateOne({
										"_id":ObjectId(_id)
									},{
										$push:{
											"notifications":{
												"_id":ObjectId(),
												"type":"add_friends_request",
												"content":me.name +"send friend request ",
												"profileImage": me.profileImage,
												"status":"Pending",
												"createAt": new Date().getTime()
											}
										}
									});
									result.json({
										"status":"success",
										"message":"Friend request has been sent."
									});
								});
							});
						}
					});
				}			
			});
		});
		
		app.get("/allTour", function (request, result) {
			result.render("allTour");
		});

		app.post("/editLichTrinh",function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var idlichtrinh = request.fields.idlichtrinh;
			var tieude = request.fields.tieude;
			var noidung = request.fields.noidung;
			database.collection("user").findOne({
				"accessToken":accessToken
			},function(error,user){
				if (user == null){
					result.json({
						"status":"error",
						"message":"User has been logout. Please login again."
					});
				} else {
					database.collection("tours").findOne({
						"_id":ObjectId(_id)
					},function(error,tour){
						if(tour.user._id.toString()==user._id.toString()){
							database.collection("tours").updateOne({
								$and:[
									{
										"_id":tour._id
									},
									{
										"tours.lichTrinh._id": ObjectId(idlichtrinh)
									}
								]
							},{
								$set:{
									"lichTrinh":{
										"tieude": tieude,
										"noidung": noidung
									}
								}
							},function(error,data){
								result.json({
									"status":"success",
									"message":"Data has been fetched."
								});
							});
						}else{
							result.json({
								"status":"error",
								"message":"You does not own tour"
							});
						}
					});
				}
			});
		});

		app.post("/deleteTour",function(request,result){
			var _id = request.fields._id;
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken":accessToken
			},function(error,user){
				if(user==null){
					result.json({
						"status":"error",
						"message":"User has been logout. Please login again."
					});
				} else {
					database.collection("tours").findOne({
						"_id":ObjectId(_id)
					},function(error,tour){
						if(tour.user._id.toString()==user._id.toString()){
							for(var a=0;a<tour.members.length;a++){
								var member = tour.members[a];
								database.collection("tours").updateOne({
									"_id":ObjectId(_id)										
								},{
									$pull:{
										"members":{
											"_id": member._id
										}
									}
								});
								database.collection("users").updateOne({
									"_id": member._id
								},{
									$pull:{
										"tours":{
											"_id": tour._id
										}
									}
								});
							}
							database.collection("tours").deleteOne({
								"_id":ObjectId(_id)
							});
							result.json({
								"status":"success",
								"message":"Data has been fetched."
							});
						} else {
							result.json({
								"status":"error",
								"message":"You does not own this tour."
							});
						}
					});
				}
			});
		});

		app.post("/sendInviteJoinTour", function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var tourid = request.fields.tourid;
			console.log(tourid);
			console.log(_id);
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error,user){
				if (user == null) {
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id":ObjectId(_id)
					}, function(error,user){
						if (user == null){
							result.json({
								"status":"error",
								"message":"User does not exist"
							});
						} else {						
							database.collection("tours").findOne({
								"_id":ObjectId(tourid)
							}, function(error,tour){
								if (tour == null){
									result.json({
										"status":"error",
										"message":"Tour does not exist."
									});
								} else {
									var isMember = false;
									for (var a=0;a<tour.members.length;a++){
										var member = tour.members[a];

										if(member._id.toString()==user._id.toString()){
											isMember = true;
											break;
										}
									}
									if (!isMember){
										if (tour.user._id.toString()==me._id){
											database.collection("tours").updateOne({
												"_id":ObjectId(tourid)
											},{
												$push:{
													"members":{
														"_id":user._id,
														"name": user.name,
														"profilename": user.profilename,
														"status":"Pending"
													}
												}
											}, function(error, data){
												database.collection("users").updateOne({
													"_id":ObjectId(_id)
												},{
													$push:{
														"tours":{
															"_id": tour._id,
															"name": tour.tenChuyenDi,
															"status":"Pending"
														},
														"notifications":{
															"_id":ObjectId(),
															"type":"tour_invite_join",
															"content":me.name +"invite you to join "+tour.tenChuyenDi+"tour.",
															"profileImage": me.profileImage,
															"tourId": tour._id,
															"userId":user._id,
															"status":"Pending",
															"createAt": new Date().getTime()
														}
													}
												}, function (error, data){
													result.json({
														"status":"success",
														"message":"Invite request has been sent."
													});
												});
											});
										} else {
											result.json({
												"status":"error",
												"message":"You does not own this tour."
											});
										}
									}else {
										result.json({
											"status":"error",
											"message":"Thành viên này đã ở trong tour."
										});
									}
								}
							});
						}
					});
				}			
			});
		});
		app.post("/acceptInviteJoinTour",function(request,result){
			var accessToken = request.fields.accessToken;
			var tourid = request.fields.tourid;
			var userid = request.fields.userid;
			console.log(tourid);
			console.log(userid);
			database.collection("users").findOne({
				"accessToken":accessToken
			},function(error,user){
				if(user==null){
					result.json({
						"status":"error",
						"message":"User has been log out.Please login again."
					});
				} else {
					var me= user;
					database.collection("tours").findOne({
						"_id":ObjectId(tourid)
					},function(error,tour){
						if(tour==null){
							result.json({
								"status":"error",
								"message":"Tour does not exist."
							});
						} else {
							database.collection("tours").updateOne({
								$and:[
									{"_id":ObjectId(tourid)},
									{"members._id": user._id}
								]
							},{
								$set:{
									"members.$.status":"Accepted"
								}
							},function(error,data){
								database.collection("users").updateOne({
									$and:[
										{"_id":user._id},
										{"tours._id":tourid}
									]
								},{
									$set:{
										"tours.$.status":"Accepted"
									}
								},function(error,data){
									database.collection("users").updateOne({
										"_id":userid
									},{
										$push:{
											"notifications":{
												"_id":ObjectId(),
												"type":"notifications",
												"content":user.name +" accepted request to join your tour.",
												"profileImage": user.profileImage,
												"tourId": tour._id,
												"userId":user._id,
												"status":"Pending",
												"createAt": new Date().getTime()
											}
										}
									});
									result.json({
										"status":"success",
										"message":"Welcome to tour."
									});
								});
							});
						}
					});
				}
			});
		});

		app.post("/getTourChat",function(request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null){
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				}else {
					database.collection("tours").findOne({
						"_id":ObjectId(_id)
					},function(error,tour){
						result.json({
							"status":"success",
							"message":"Record has been fetched",
							"data": tour.inbox
						});
					})		
				}
			});
		});
		app.post("/sendTourMessage", function (request,result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var message = request.fields.message;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user){
				if (user == null) {
					result.json({
						"status":"error",
						"message": "User has been logged out. Please login again."
					});
				} else {				
					database.collection("tours").updateOne({
						"_id":ObjectId(_id)
					},{
						$push: {
							"inbox":{
								"_id": ObjectId(),
								"message": message,
								"from": user._id,
								"name": user.name
							}
						}
					}, function (error, data){
						socketIO.broadcast.emit("messageTourReceived",{
							"message":message,
							"from": user._id
						});
						result.json({
							"status":"success",
							"message":"Message has been sent"
						});
					});						
				}
			});
		});			
	});
});