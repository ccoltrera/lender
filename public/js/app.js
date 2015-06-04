window.onload = function () {

var lenderAppRef, usersRef, itemsRef, trackersRef;

//Creates a Firebase() object, which links to Colin's Firebase
lenderAppRef = new Firebase("http://boiling-torch-5679.firebaseIO.com");

//Creates Firebase() objects, which link to relevant sub-nodes of the Firebase
//data structure.
usersRef = lenderAppRef.child("users");
itemsRef = lenderAppRef.child("items");
trackersRef = lenderAppRef.child("trackers");

//User() object constructor.
function User(userIdent) {
  this.userIdent = userIdent;
  //inventory array contains UPCs of Item() objects created and owned by the user.
  this.inventory = [];
  //ledger object contains arrays of transaction IDs
  this.ledger = {
    //lent array contains transaction IDs of Tracker() objects in which they are lender.
    lent: [],
    //borrowed array contains transaction IDs of Tracker() objects in which they are borrower.
    borrowed: []
  };
  //Keeps track of the individual user's reference in the Firebase.
  this.userRef = usersRef.child(this.userIdent);
}

//Creates a node in Firebase for the given user.
User.prototype.initialize = function () {
  this.userRef.child("userIdent").set(this.userIdent);
}

//Creates a new Item() object, adds it to the user's inventory browser side
//and on Firebase.
User.prototype.createItem = function(itemDetails) {
  var upc, item;
  upc = this.generateUPC(itemDetails);
  item = new Item(this.userIdent, itemDetails);
  //Adds UPC to user's inventory
  this.inventory.push(upc);
  //Overwrites Firebase inventory with local inventory.
  this.userRef.child("inventory").set(this.inventory);
  //Adds item to Firebase
  itemsRef.child(upc).set(item);

}

//Generates a UPC for item, using the itemDetails and the userIdent converted to unicode and turned into
//a string separated by '
User.prototype.generateUPC = function(itemDetails) {
  var slug, unicode, upc;
  slug = this.userIdent + itemDetails;
  unicode = [];

  for (var i=0; i < slug.length; i++) {
    unicode.push(slug.charCodeAt(i));
  }

  upc = unicode.join("-");

  return upc;
}

//should render the table




User.prototype.initializeLend = function() {

}

User.prototype.confirmReturn = function() {

}

User.prototype.confirmBorrow = function() {

}

User.prototype.returnItem = function() {

}

function Item(owner, itemDetails) {
  this.owner = owner;
  this.itemDetails = itemDetails;
}

function Polonius() {

}

//Loads a form into the body, and passes the function to be used with the form data.
Polonius.prototype.loadForm = function(formName, functionToCall) {
  var parseForm, thisPolonius;

  parseForm = this.parseForm;
  thisPolonius = this;

  $.get(formName + '.html', function(data) {
    $("body").html(data);
    $("#" + formName + "_form").on("submit", function(event) {
      event.preventDefault();
      var parsedData = parseForm($(this).serialize());
      functionToCall(thisPolonius, parsedData[0], parsedData[1], parsedData[2]);
    });
  });
}

//Parses the serialized data from a form, returns array of form values without their associated names.
Polonius.prototype.parseForm = function(serializedData) {
  dataArray = serializedData.split("&");
  for (var i = 0; i < dataArray.length; i++) {
    dataArray[i] = dataArray[i].slice(dataArray[i].indexOf("=") + 1);
  }

  return dataArray;
}

//Sets userIdent in local storage, sets Polonius() object's currentUser to a new User() object
//and uses initialize() to add it to Firebase.
Polonius.prototype.createNewUser = function(thisPolonius, userIdent) {
  localStorage.setItem('lenderUserIdent', userIdent);

  thisPolonius.currentUser = new User(userIdent);
  thisPolonius.currentUser.initialize();
}

//creates new Item, using the currentUser User() object.
Polonius.prototype.createNewItem = function(thisPolonius, itemDetails) {
  thisPolonius.currentUser.createItem(itemDetails);
}

//Takes a userIdent string, pulls a user off of Firebase and sets it as the Polonius() object's currentUser property.
Polonius.prototype.setUserFromFirebase = function(userIdent) {
  //
  usersRef.child(userIdent).once('value', $.proxy(function(userSnapshot) {
    var user;
    user = new User(userIdent);
    if (userSnapshot.val()['inventory']) {
      user.inventory = userSnapshot.val()['inventory'];
    }
    if (userSnapshot.val()['ledger']) {
      user.ledger = userSnapshot.val()['ledger'];
    }

    user.userRef = usersRef.child(localStorage['lenderUserIdent']);

    this.currentUser = user;

  },this));
}

Polonius.prototype.renderValues =function() {
  var userIdent = 'Mike';

  var users, trackers, item, itemSpecific, transactionID;
  var upcLentOut = []; //holds upc codes for items lent out
  var upcBorrowed = []; //holds upc codes for borrowed items
  var borrower = [];//holds borrower names for lent half of ledger
  var allItems = [];//stores every items key (upc)
  var owner = [];//stores the values of the owners that have been tracked
  var itemNamesBorrowed = [];//stores the itemDetails of items borrowed
  var itemNamesLent = []; //stores the itemDetails of items Lent out
  var transIds = [];//stores all the transaction IDs
  var borrowConfirmed = [];//stores boolean values for when users confirm items
                           //have been borrowed
  var itemReceived = [];//stores boolean values for when users receive items
  var itemReturned = [];//stores boolean values for when users confirm returns
  var storedArrays = [];//stores the arrays needed to make table and input work
/*
  //not sure if needed goes into user firebase
  usersRef.once('value', function(userSnapshot) {
    users = userSnapshot.val();
    userNames = Object.keys(users);
    for (var u = 0; u < userNames.length; u++) {
      transIds.push(users[userNames[u]]['ledger']['lent']);
      transIds.push(users[userNames[u]]['ledger']['borrowed']);
    };
  });
*/

  //for trackers objects in firebase
  trackersRef.once('value', function(trackersSnapshot) {
    trackers = trackersSnapshot.val(); //should give objects with trackers titles

    //gets values within objects
    for (var transactionID in trackers) {
      // console.log('trackers ' + userIdent);
      // console.log('trackers ' + trackers[transactionID].owner);
      if (userIdent == trackers[transactionID].owner) {
        //push to give arrays the values
        upcLentOut.push(trackers[transactionID].upc);
        borrower.push(trackers[transactionID].borrower);
        borrowConfirmed.push(trackers[transactionID].borrowConfirmed);
        itemReceived.push(trackers[transactionID].itemReceived)
        itemReturned.push(trackers[transactionID].itemReturned)
      } else if(userIdent == trackers[transactionID].borrower) {
        //gets the upc of the items being borrowed
        upcBorrowed.push(trackers[transactionID].upc);
      }
    };
  });

  //for scope issues
  var that = this;

  //for items objects in firebase
  itemsRef.once('value', function(itemsSnapshot) {
    items = itemsSnapshot.val();

    //Object.keys will give the key values which = upc for all items
    var allItems = Object.keys(items);
    for (var k = 0; k < allItems.length; k++){
      for(var a = 0; a < upcBorrowed.length; a++){

        //should find the values needed only from the upc codes that match
        if (allItems[k] == upcBorrowed[a]) {

          owner.push(items[upcBorrowed[a]].owner);
          itemNamesBorrowed.push(items[upcBorrowed[a]].itemDetails)
        }
      }

      for(var l = 0; l < upcLentOut.length; l++){
        if (allItems[k] == upcLentOut[l]) {
          itemNamesLent.push(items[upcLentOut[l]].itemDetails)
        };
      };
    };
    storedArrays.push(owner);
    storedArrays.push(itemNamesLent);
    storedArrays.push(itemNamesBorrowed);
    storedArrays.push(borrower);
    storedArrays.push(borrowConfirmed);
    storedArrays.push(itemReceived);
    storedArrays.push(itemReturned);
    that.renderTable(storedArrays);
  });

};

Polonius.prototype.renderTable =function(storedArrays) {
  var lentTable, lRow, bRow;
  var owner = storedArrays[0];
  var itemNamesLent = storedArrays[1];
  var itemNamesBorrowed = storedArrays[2];
  var borrower = storedArrays[3];
  var borrowConfirmed = storedArrays[4];
  var itemReceived = storedArrays[5];
  var itemReturned = storedArrays[6];

  //for lentTable
  $lentTable = $('#lent-table');
  for (t = 0; t < borrower.length; t++) {
    $lRow = $('<tr>').append('<td><input type="checkbox"></input></td><td>' + itemNamesLent[t] + '</td><td>' + borrower[t] +'</td></tr>');
    $lentTable.append($lRow);
  }

  //for borrow table
  $borrowedTable = $('#borrowed-table');
  for (b = 0; b < owner.length; b++) {
    $bRow = $('<tr>').append('<td><input type="checkbox"></input></td><td>' + itemNamesBorrowed[b] + '</td><td>' + owner[b] +'</td></tr>');
    $borrowedTable.append($bRow);
  }

}


//for testing purposes
var table = new Polonius();
table.renderValues();

};
