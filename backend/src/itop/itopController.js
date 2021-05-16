const db = require("../../postgres/itopDbController");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const shortId = require("shortId");

//auth
const authorization = async (req, res) => {
  const user = req.body.user;
  const userFromDB = await db.findUserFromDb(user.email);
  if (!userFromDB) {
    console.log('Incorrect Login')
    return res
      .status(200)
      .send({ status: "ERROR", message: "Incorrect Login" });
  }
  const isPasswValid = bcrypt.compareSync(
    req.body.user.password,
    userFromDB.password
  );
  if (!isPasswValid) {
    return res
      .status(200)
      .send({ status: "ERROR", message: "Incorrect Password" });
  }

  const session = await createSession(userFromDB);
  if (session.status === "SUCCES") {
    return res.status(200).send({
      token: session.token,
      status: "SUCCES",
      user: {
        name: userFromDB.username,
        isAdmin: userFromDB.isadmin,
        email: userFromDB.email,
      },
    });
  }
};

const createSession = async (user) => {
  const token = jwt.sign(user.id, config.secret);
  const time = new Date();
  const tokenExpiredTime = time.setDate(time.getDate() + 30);
  const tokenWithExpiredTime = tokenExpiredTime + "." + token;
  const dbResp = await db.pushTokenToDb(user.email, tokenWithExpiredTime);
  return dbResp;
};

const createUser = async (req, res) => {
  const hashedPassword = bcrypt.hashSync(
    req.body.user.password,
    config.saltRounds
  );
  const user = {
    userName: req.body.user.userName,
    password: hashedPassword,
    email: req.body.user.email.toLowerCase(),
    isAdmin: req.body.user.isAdmin,
    id: shortId.generate(),
  };
  const dbResponse = await db.createUser(user);
  if (dbResponse.status === "ERROR" || dbResponse.status === "NOT CREATED") {
    return res.status(202).send(dbResponse);
  }

  const session = await createSession(dbResponse.user);
  if (session.status === "SUCCES") {
    return res.status(201).send({
      token: session.token,
      status: "SUCCES",
      user: {
        name: dbResponse.user.userName,
        isAdmin: dbResponse.user.isadmin,
        email: dbResponse.user.email,
      },
    });
  }
};
const logOut = async (req, res) => {
  const dbResponse = await db.deleteSession(req.body.token)
  return res.status(200).send(dbResponse)
}

const checksession = async (req, res) => {
  if (!req.body.token) {
    return res.status(400).send({ status: "NO TOKEN" })
  }
  const findSession = await db.checkSession(req.body.token)
  const sessionLifeTime = + findSession.token.split('.')[0]
  const now = new Date().getTime()
  if (now > sessionLifeTime) {
    db.deleteSession(req.body.token)
    return res.status(200).send({ status: "ERROR", message: "VEEERY OLD SESSION" })

  }
  if (!findSession) {
    return res.status(200).send({ status: "ERROR", message: "NOT VALID SESSION" })

  }
  const userLoged = await db.findUserFromDb(findSession.email)
  return res.status(200).send({
    status: "SUCCES", user: {
      email: userLoged.email,
      id: userLoged.id,
      isadmin: true,
      username: userLoged.username
    }
  })
}


const getUsers = async (req, res) => {

  const dataResp = await db.getUsers(req.body.token);
  console.log(dataResp)
  if (dataResp.error) {
    return res.status(200).send({status:"ERROR", error:dataResp.error});
  }
  return res.status(200).send({status:"SUCCES", users:dataResp});
};

const updateUser = async (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password, config.saltRounds);
  const user = {
    password: hashedPassword,
    email: req.body.email,
    isAdmin: req.body.isAdmin,
    id: req.body.id,
  };
  const dbResponse = await db.updateUser(user);
  return res.status(200).send(dbResponse);
};

const deleteUser = async (req, res) => {
  const dbResponse = await db.deleteUser(req.body.id);
  return res.status(200).send(dbResponse);
};

//PROFILES

const getProfiles = async (req, res) => {
  const dataResp = await db.getProfiles();
  if (dataResp.error) {
    return res.status(200).send(dataResp);
  }
  return res.status(201).send(dataResp);
};

const createProfile = async (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password, config.saltRounds);
  const user = {
    password: hashedPassword,
    email: req.body.email,
    isAdmin: req.body.isAdmin,
    id: shortId.generate(),
  };
  const dbResponse = await db.createProfile(user);
  return res.status(201).send(dbResponse);
};

const updateProfile = async (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password, config.saltRounds);
  const user = {
    password: hashedPassword,
    email: req.body.email,
    isAdmin: req.body.isAdmin,
    id: req.body.id,
  };
  const dbResponse = await db.updateProfile(user);
  return res.status(200).send(dbResponse);
};

const deleteProfile = async (req, res) => {
  const dbResponse = await db.deleteProfile(req.body.id);
  return res.status(200).send(dbResponse);
};

module.exports = {
  authorization,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  logOut,
  checksession
};
