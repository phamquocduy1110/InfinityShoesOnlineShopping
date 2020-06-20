//CLI: npm install multer --save
var express = require('express');
var router = express.Router();
// middleware
var multer = require('multer');
var upload = multer({});
// utils
var MyUtil = require("../utils/MyUtil.js");
var EmailUtil = require("../utils/EmailUtil.js");
// daos
var pathDAO = "../daos/mongodb";
var AdminDAO = require(pathDAO + "/AdminDAO.js");
var OrderDAO = require(pathDAO + "/OrderDAO.js");
var CategoryDAO = require(pathDAO + "/CategoryDAO.js");
var ProductDAO = require(pathDAO + "/ProductDAO.js");
var CustomerDAO = require(pathDAO + "/CustomerDAO.js");
// routes
router.get(['/', '/home'], function (req, res) {
  if (req.session.admin) {
    res.render('../views/admin/home.ejs');
  } else {
    res.redirect('./login');
  }
});
// admin
router.get('/login', function (req, res) {
  res.render('../views/admin/login.ejs');
});
router.post('/login', async function (req, res) {
  var username = req.body.txtUsername;
  var password = req.body.txtPassword;
  var admin = await AdminDAO.selectByUsernameAndPassword(username, password);
  if (admin) {
    req.session.admin = admin;
    res.redirect('./home');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './login');
  }
});
router.get('/logout', function (req, res) {
  delete req.session.admin;
  res.redirect('./home');
});
// category
router.get('/listcategory', async function (req, res) {
  var categories = await CategoryDAO.selectAll();
  res.render('../views/admin/listcategory.ejs', { cats: categories });
});
router.post('/addcategory', async function (req, res) {
  var name = req.body.txtName;
  var category = { name: name };
  var result = await CategoryDAO.insert(category);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listcategory');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listcategory');
  }
});
router.post('/updatecategory', async function (req, res) {
  var _id = req.body.txtID;
  var name = req.body.txtName;
  var category = { _id: _id, name: name };
  var result = await CategoryDAO.update(category);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listcategory');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listcategory');
  }
});
router.post('/deletecategory', async function (req, res) {
  var _id = req.body.txtID;
  var result = await CategoryDAO.delete(_id);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listcategory');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listcategory');
  }
});
// product
router.get('/listproduct', async function (req, res) {
  // get data
  var categories = await CategoryDAO.selectAll();
  var products = await ProductDAO.selectAll();
  console.table(products);
  // pagination
  var sizePage = 4;
  var noPages = Math.ceil(products.length / sizePage);
  var curPage = 1;
  if (req.query.page) curPage = req.query.page; // /listproduct?page=XXX
  var offset = (curPage - 1) * sizePage;
  products = products.slice(offset, offset + sizePage);
  // render view
  res.render('../views/admin/listproduct.ejs', { prods: products, noPages: noPages, curPage: curPage });
});

router.get('/addproduct', async function (req, res) {
  var categories = await CategoryDAO.selectAll();
  res.render('admin/addproduct', {categories});
});

router.post('/addproduct', upload.single('fileImage'), async function (req, res) {
  var name = req.body.txtName;
  var price = parseInt(req.body.txtPrice);
  var catID = req.body.cmbCategory;
  if (req.file) {
    var image = req.file.buffer.toString('base64');
    var now = new Date().getTime(); // milliseconds
    var category = await CategoryDAO.selectByID(catID);
    var product = { name: name, price: price, image: image, cdate: now, category: category };
    var result = await ProductDAO.insert(product);
    if (result) MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listproduct');
  }
  MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listproduct');
});
router.post('/updateproduct', upload.single('fileImage'), async function (req, res) {
  var _id = req.body.txtID;
  var name = req.body.txtName;
  var price = parseInt(req.body.txtPrice);
  var catID = req.body.cmbCategory;
  if (req.file) {
    var image = req.file.buffer.toString('base64');
  } else {
    var dbProduct = await ProductDAO.selectByID(_id);
    var image = dbProduct.image;
  }
  var now = new Date().getTime(); // milliseconds
  var category = await CategoryDAO.selectByID(catID);
  var product = { _id: _id, name: name, price: price, image: image, cdate: now, category: category };
  var result = await ProductDAO.update(product);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listproduct');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listproduct');
  }
});
router.post('/deleteproduct', upload.single('fileImage'), async function (req, res) {
  var _id = req.body.txtID;
  var result = await ProductDAO.delete(_id);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listproduct');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listproduct');
  }
});
// order
router.get('/listorder', async function (req, res) {
  var orders = await OrderDAO.selectAll();
  var _id = req.query.id; // /listorder?id=XXX
  if (_id) {
    var order = await OrderDAO.selectByID(_id);
  }
  res.render('../views/admin/listorder.ejs', { orders: orders, order: order });
});
router.get('/updatestatus', async function (req, res) {
  var _id = req.query.id; // /updatestatus?status=XXX&id=XXX
  var newStatus = req.query.status;
  await OrderDAO.update(_id, newStatus);
  res.redirect('./listorder?id=' + _id);
});
// customer
router.get('/listcustomer', async function (req, res) {
  var customers = await CustomerDAO.selectAll();
  var _cid = req.query.cid; // /listcustomer?cid=XXX
  if (_cid) {
    var orders = await OrderDAO.selectByCustID(_cid);
    var _oid = req.query.oid; // /listcustomer?cid=XXX&oid=XXX
    if (_oid) {
      var order = await OrderDAO.selectByID(_oid);
    }
  }
  res.render('../views/admin/listcustomer.ejs', { custs: customers, orders: orders, order: order, custID: _cid });
});
router.get('/sendmail', async function (req, res) {
  var _id = req.query.id; // /sendmail?id=XXX
  var cust = await CustomerDAO.selectByID(_id);
  if (cust) {
    var result = await EmailUtil.send(cust.email, cust._id, cust.token);
    if (result) {
      MyUtil.showAlertAndRedirect(res, 'CHECK EMAIL!', './listcustomer');
    } else {
      MyUtil.showAlertAndRedirect(res, 'EMAIL FAILURE!', './listcustomer');
    }
  } else {
    res.redirect('./listcustomer');
  }
});
router.get('/deactive', async function (req, res) {
  var _id = req.query.id; // /deactive?id=XXX&token=XXX
  var token = req.query.token;
  var result = await CustomerDAO.active(_id, token, 0);
  if (result) {
    MyUtil.showAlertAndRedirect(res, 'OK BABY!', './listcustomer');
  } else {
    MyUtil.showAlertAndRedirect(res, 'SORRY BABY!', './listcustomer');
  }
});
module.exports = router;