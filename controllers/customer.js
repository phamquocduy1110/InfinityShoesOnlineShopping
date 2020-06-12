var express = require('express');``
var router = express.Router();
// utils
var MyUtil = require("../utils/MyUtil.js");
var EmailUtil = require("../utils/EmailUtil.js");
// daos`
var pathDAO = "../daos/mongodb";
var CategoryDAO = require(pathDAO + "/CategoryDAO.js");
var ProductDAO = require(pathDAO + "/ProductDAO.js");
var CustomerDAO = require(pathDAO + "/CustomerDAO.js");
var OrderDAO = require(pathDAO + "/OrderDAO.js");
// routes
router.get(['/', '/home'], async function (req, res) {
  var categories = await CategoryDAO.selectAll();
  var newproducts = await ProductDAO.selectTopNew(3);
  var hotproducts = await ProductDAO.selectTopHot(3);
  res.render('../views/customer/home.ejs', { cats: categories, newprods: newproducts, hotprods: hotproducts });
});
// product
router.get('/listproduct', async function (req, res) {
  var categories = await CategoryDAO.selectAll();
  var _cid = req.query.catID; // /listproduct?catID=XXX
  var products = await ProductDAO.selectByCatID(_cid);
  res.render('../views/customer/listproduct.ejs', { cats: categories, prods: products });
});
router.post('/search', async function (req, res) {
  var categories = await CategoryDAO.selectAll();
  var keyword = req.body.txtKeyword;
  var products = await ProductDAO.selectByKeyword(keyword);
  res.render('../views/customer/listproduct.ejs', { cats: categories, prods: products });
});
router.get('/details', async function (req, res) {
  var _id = req.query.id; // /details?id=XXX
  var product = await ProductDAO.selectByID(_id);
  res.render('../views/customer/details.ejs', { prod: product });
});
// customer
router.get('/signup', function (req, res) {
  res.render('../views/customer/signup.ejs');
});
router.post('/signup', async function (req, res) {
  var username = req.body.txtUsername;
  var password = req.body.txtPassword;
  var name = req.body.txtName;
  var phone = req.body.txtPhone;
  var email = req.body.txtEmail;
  var dbCust = await CustomerDAO.selectByUsernameOrEmail(username, email);
  if (dbCust) {
    MyUtil.showAlertAndRedirect(res, 'EXISTS USERNAME OR EMAIL!', './signup');
  } else {
    var now = new Date().getTime(); // milliseconds
    var token = MyUtil.md5(now.toString());
    var newCust = { username: username, password: password, name: name, phone: phone, email: email, active: 0, token: token };
    var newID = await CustomerDAO.insert(newCust);
    if (newID) {
      var result = await EmailUtil.send(email, newID, token);
      if (result) {
        MyUtil.showAlertAndRedirect(res, 'CHECK EMAIL!', './login');
      } else {
        MyUtil.showAlertAndRedirect(res, 'EMAIL FAILURE!', './signup');
      }
    } else {
      MyUtil.showAlertAndRedirect(res, 'INSERT FAILURE!', './signup');
    }
  }
});
router.get('/verify', async function (req, res) {
  var _id = req.query.id; // /verify?id=XXX&token=XXX
  var token = req.query.token;
  var result = await CustomerDAO.active(_id, token, 1);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './login');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './signup');
  }
});
router.get('/login', function (req, res) {
  res.render('../views/customer/login.ejs');
});
router.post('/login', async function (req, res) {
  var username = req.body.txtUsername;
  var password = req.body.txtPassword;
  var customer = await CustomerDAO.selectByUsernameAndPassword(username, password);
  if (customer && customer.active == 1) {
    req.session.customer = customer;
    res.redirect('./home');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './login');
  }
});
router.get('/logout', function (req, res) {
  delete req.session.customer;
  res.redirect('./home');
});
// myprofile
router.get('/myprofile', function (req, res) {
  res.render('../views/customer/myprofile.ejs');
});
router.post('/myprofile', async function (req, res) {
  var curCust = req.session.customer;
  if (curCust) {
    var username = req.body.txtUsername;
    var password = req.body.txtPassword;
    var name = req.body.txtName;
    var phone = req.body.txtPhone;
    var email = req.body.txtEmail;
    var newCust = { _id: curCust._id, username: username, password: password, name: name, phone: phone, email: email, active: curCust.active, token: curCust.token };
    var result = await CustomerDAO.update(newCust);
    if (result) {
      req.session.customer = newCust;
      MyUtil.showAlertAndRedirect(res, 'OK BABY!', './home');
    }
  }
  MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './myprofile');
});
// myorders
router.get('/myorders', async function (req, res) {
  var cust = req.session.customer;
  if (cust) {
    var orders = await OrderDAO.selectByCustID(cust._id);
    var _id = req.query.id; // /myorders?id=XXX
    if (_id) {
      var order = await OrderDAO.selectByID(_id);
    }
    res.render('../views/customer/myorders.ejs', { orders: orders, order: order });
  } else {
    res.redirect('./home');
  }
});
// mycart
router.get('/mycart', function (req, res) {
  if (req.session.mycart && req.session.mycart.length > 0) {
    var total = MyUtil.getTotal(req.session.mycart);
    res.render('../views/customer/mycart.ejs', { total: total });
  } else {
    res.redirect('./home');
  }
});
router.post('/add2cart', async function (req, res) {
  var _id = req.body.txtID;
  var quantity = parseInt(req.body.txtQuantity);
  var product = await ProductDAO.selectByID(_id);
  // create empty cart if not exists in the session, otherwise get out mycart from the session
  var mycart = [];
  if (req.session.mycart) mycart = req.session.mycart;
  var index = mycart.findIndex(x => x.product._id == _id); // check if the _id exists in mycart
  if (index == -1) { // not found, push newItem
    var newItem = { product: product, quantity: quantity };
    mycart.push(newItem);
  } else { // increasing the quantity
    mycart[index].quantity += quantity;
  }
  req.session.mycart = mycart; // put mycart back into the session
  //console.log(req.session.mycart); // for DBUG
  res.redirect('./home');
});
router.get('/remove2cart', function (req, res) {
  if (req.session.mycart) {
    var mycart = req.session.mycart;
    var _id = req.query.id; // /remove2cart?id=XXX
    var index = mycart.findIndex(x => x.product._id == _id);
    if (index != -1) { // found, remove item
      mycart.splice(index, 1);
      req.session.mycart = mycart;
    }
  }
  res.redirect('./mycart');
});
router.get('/checkout', async function (req, res) {
  if (req.session.customer) {
    var now = new Date().getTime(); // milliseconds
    var total = MyUtil.getTotal(req.session.mycart);
    var order = { cdate: now, total: total, status: 'PENDING', customer: req.session.customer, items: req.session.mycart };
    var result = await OrderDAO.insert(order);
    if (result) {
      delete req.session.mycart;
      MyUtil.showAlertAndRedirect(res, 'OK BABY!', './home');
    } else {
      MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './mycart');
    }
  } else {
    res.redirect('./login');
  }
});
module.exports = router;