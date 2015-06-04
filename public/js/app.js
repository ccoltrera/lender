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
User.prototype.initializeUser = function () {
  this.userRef.child("userIdent").set(this.userIdent);
}

//Creates a new Item() object, adds its UPC to the user's inventory browser side
//and on Firebase.
User.prototype.createItem = function(itemDetails) {
  var upc, item;
  upc = this.generateUPC(itemDetails);
  item = new Item(this.userIdent, itemDetails);
  //Adds UPC to user's inventory
  this.inventory.push(upc);
  //Adds upc to Firebase inventory array.
  this.userRef.child("inventory/" + (this.inventory.length - 1) ).set(upc);
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

//Creates a new Tracker() object, adds transactionID to the user's ledger["lent"] on the browser side
//and on Firebase, and to the borrower's ledger["borrowed"] on Firebase. Changes item's lentOut to true
//on Firebase.
User.prototype.initializeLend = function(upc, borrower) {
  var transactionID, tracker;

  transactionID = this.generateTransactionID(upc,borrower);
  tracker = new Tracker(upc, borrower);
  //Adds transactionID to user's ledger["lent"] browser side.
  this.ledger["lent"].push(transactionID);
  //Adds transactionID to user's ledger["lent"] on Firebase.
  this.userRef.child("ledger/lent/" + (this.ledger["lent"].length - 1) ).set(transactionID);
  //Takes snapshot of borrower's ledger["borrowed"] on Firebase, then adds transactionID with appropriate key.
  usersRef.child(borrower + "/ledger/borrowed/").once('value', function(borrowerLedgerSnapshot) {

    usersRef.child(borrower + "/ledger/borrowed/" + (borrowerLedgerSnapshot.val().length) ).set(transactionID);

  });
  //Adds tracker to Firebase
  trackersRef.child(transactionID).set(tracker);
  //Change item's lentOut property to true on Firebase
  itemsRef.child(upc + "/lentOut/").set(true);

}

//Generates a transaction ID for a tracker, using date in milliseconds and item UPC,
//separated by ':'. Function can be changed later for more advanced UPC generation.
User.prototype.generateTransactionID = function(upc, borrower) {
  var date, transactionID;
  date = new Date();
  transactionID = date.valueOf() + ":" + upc;

  return transactionID;
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
  this.lentOut = false;
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
//and uses initializeUser() to add it to Firebase.
Polonius.prototype.createNewUser = function(thisPolonius, userIdent) {
  localStorage.setItem('lenderUserIdent', userIdent);

  thisPolonius.currentUser = new User(userIdent);
  thisPolonius.currentUser.initializeUser();
}

//creates new Item, using the currentUser User() object.
Polonius.prototype.createNewItem = function(thisPolonius, itemDetails) {
  thisPolonius.currentUser.createItem(itemDetails);
}

//Takes a userIdent string, pulls a user off of Firebase and sets it as the Polonius() object's currentUser property.
Polonius.prototype.setUserFromFirebase = function(userIdent) {
  //
  var that = this;

  usersRef.child(userIdent).once('value', function(userSnapshot) {
    var user;
    user = new User(userIdent);
    if (userSnapshot.val()['inventory']) {
      user.inventory = userSnapshot.val()['inventory'];
    }
    if (userSnapshot.val()['ledger']) {
      user.ledger = userSnapshot.val()['ledger'];
    }

    user.userRef = usersRef.child(userIdent);

    that.currentUser = user;

  });
}

Polonius.prototype.setNewLendForm = function() {
  this.loadForm("init_lend", this.initializeNewLend);

  var that = this;
  //Gets items snapshot from Firebase to populate items dropdown menu
  itemsRef.once("value", function(itemsSnapshot) {
    var items, item;

    items = itemsSnapshot.val();

    for (var i = 0; i < that.currentUser.inventory.length; i++) {

      item = items[that.currentUser.inventory[i]];

      if (!item.lentOut) {

        $("#item").append("<option value=" + that.currentUser.inventory[i] + ">" + item.itemDetails + "</option>");

      }
    }

  });

  //Gets users snapshot from Firebase to populate borrower dropdown menu
  usersRef.once("value", function(usersSnapshot) {
    var users, user;

    users = usersSnapshot.val();

    for (user in users) {
      if (user != that.currentUser.userIdent) {
         $("#borrower").append("<option>" + user + "</option>");
      }
    }

  });

}

Polonius.prototype.initializeNewLend = function(thisPolonius, upc, borrower) {
  thisPolonius.currentUser.initializeLend(upc, borrower);
}

function Tracker(upc, borrower) {
  this.upc = upc;
  this.borrower = borrower;
  this.borrowConfirmed = false;
  this.itemReturned = false;
  this.itemReceived = false;
}

Polonius.prototype.setUserDropdown = function() {

  usersRef.once('value', function(usersSnapshot) {
    var user;
    //Pulling names from Firebase
    var usersFromFirebase = usersSnapshot.val();
    var namesForDropdown = Object.keys(usersFromFirebase);
    console.dir(namesForDropdown);
    //Use names in object and adds to pulldown list
    var startDDPopulate = document.getElementById('selectLoginID');
    var options = namesForDropdown;

    for(var i=0; i< options.length; i++) {
      var opt = options[i];
      var el = document.createElement('option');
      el.textContent = opt;
      el.value = opt;
      startDDPopulate.appendChild(el);
    }
  });
};

var x = new Polonius();
x.setUserDropdown();

//obtains values for making ledger page tables
Polonius.prototype.renderValues =function() {
  //to change based on Polonius user
  var userIdent = this.currentUser.userIdent;

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

//makes tables for ledger page
Polonius.prototype.renderTable =function(storedArrays) {
  var lentTable, lRow, bRow;
  var owner = storedArrays[0];
  var itemNamesLent = storedArrays[1];
  var itemNamesBorrowed = storedArrays[2];
  var borrower = storedArrays[3];
  var borrowConfirmed = storedArrays[4];
  var itemReceived = storedArrays[5];
  var itemReturned = storedArrays[6];

  console.log(storedArrays);

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
window.onload = function () {
  //to load html table before js is called
  var table = new Polonius();
  table.renderValues();
};
