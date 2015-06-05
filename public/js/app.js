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
  var borrowConfirmedFromOwner = [];/*stores boolean values for when users
                                      confirm itemshave been borrowed */
  var borrowConfirmedFromBorrower = [];
  var myItemReceived = [];
  var itemReceivedFromFriend = [];//stores boolean values for when users receive items
  var itemReturnedFromBorrower = [];//stores boolean values for when users confirm returns
  var itemReturnedToLender = []; //stores boolean values for when returned button is pressed to
  var transIdLentOut = []; //stores transaction IDs
  var transIdBorrowed = [];
  var storedArrays = [];//stores the arrays needed to make table and input work


  //Obtains for trackers objects in firebase
  trackersRef.once('value', function(trackersSnapshot) {
    trackers = trackersSnapshot.val(); //converts snapshot to workable objects

    //gets values within objects
    for (var transactionID in trackers) {
      if (userIdent == trackers[transactionID].owner) {
        //pushes values needed for lent ledger
        upcLentOut.push(trackers[transactionID].upc);
        transIdLentOut.push(trackers[transactionID].transactionID)
        borrower.push(trackers[transactionID].borrower);
        borrowConfirmedFromOwner.push(trackers[transactionID].borrowConfirmed);
        itemReturnedFromBorrower.push(trackers[transactionID].itemReturned);
        myItemReceived.push(trackers[transactionID].itemReceived);
      } else if (userIdent == trackers[transactionID].borrower) {
        //pushes values needed for borrowed ledger
        borrowConfirmedFromBorrower.push(trackers[transactionID].borrowConfirmed);
        itemReturnedToLender.push(trackers[transactionID].itemReturned);
        itemReceivedFromFriend.push(trackers[transactionID].itemReceived);
        upcBorrowed.push(trackers[transactionID].upc);
        transIdBorrowed.push(trackers[transactionID].transactionID);
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

        //Finds the values needed only from the upc codes that match
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
    storedArrays.push(borrowConfirmedFromOwner);
    storedArrays.push(borrowConfirmedFromBorrower);
    storedArrays.push(myItemReceived);
    storedArrays.push(itemReceivedFromFriend);
    storedArrays.push(itemReturnedFromBorrower);
    storedArrays.push(itemReturnedToLender);
    storedArrays.push(transIdLentOut);
    storedArrays.push(transIdBorrowed);
    storedArrays.push(upcLentOut);
    storedArrays.push(upcBorrowed);
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
  var borrowConfirmedFromOwner = storedArrays[4];
  var borrowConfirmedFromBorrower = storedArrays[5];
  var myItemReceived = storedArrays[6];
  var itemReceivedFromFriend = storedArrays[7];
  var itemReturnedFromBorrower = storedArrays[8];
  var itemReturnedToLender = storedArrays[9];
  var transIdLentOut = storedArrays[10];
  var transIdBorrowed = storedArrays[11];
  var upcLentOut = storedArrays[12];
  var upcBorrowed = storedArrays[13];

  //Creates Rows for Lent Table
  $lentTable = $('#lent-table');
  for (var t = 0; t < borrower.length; t++) {
    //makes table if borrow is confirmed and item has not been returned
    if (borrowConfirmedFromOwner[t] && ((itemReturnedFromBorrower[t] == false) || myItemReceived[t] == false)) {
      //replaces button with checkmark if item had been recieved
      if (myItemReceived[t]) {
        //replaces recieved button with checkmark
        $lRow = $('<tr>').append('<td>&#x2713</td><td>' + itemNamesLent[t] + '</td><td>' + borrower[t] +'</td></tr>');
      } else {
        $lRow = $('<tr>').append('<td><button class="receivedCheckbox" value="' + transIdLentOut[t] +'">Received</button></td><td>' + itemNamesLent[t] + '</td><td>' + borrower[t] +'</td></tr>');
      };
      $lentTable.append($lRow);
    }
  }

  //Creates Rows for Borrowed table
  $borrowedTable = $('#borrowed-table');
  for (var b = 0; b < owner.length; b++) {
    console.log(itemReceivedFromFriend[b]);
    console.log(itemReturnedToLender[b]);
    console.log(borrowConfirmedFromBorrower[b]);
    //makes table if item has been recieved and item has not been returned
    if (itemReceivedFromFriend[b] && ((itemReturnedToLender[b] == false) || borrowConfirmedFromBorrower[b] == false)) {
      if (itemReturnedToLender[b]) {
        //replaces returned button with checkmark
        $bRow = $('<tr>').append('<td>&#x2713</td><td>' + itemNamesBorrowed[b] + '</td><td>' + owner[b] +'</td></tr>');
      } else {
        $bRow = $('<tr>').append('<td><button class="returnedCheckbox" value="' + transIdBorrowed[b] +'">Returned</button></td><td>' + itemNamesBorrowed[b] + '</td><td>' + owner[b] +'</td></tr>');
      };
      $borrowedTable.append($bRow);
    };
  };

  var that = this;

  //changes received button to true
  $('.receivedCheckbox').on("click", function(e) {
    for (var z = 0; z < myItemReceived.length; z++) {
      trackersRef.child(transIdLentOut[z] + "/itemReceived/").set(true);

    }
    // window.onload = function () {
    //   var x = new Polonius();
    //   table.renderValues();
    // }
  });

  //changes returned button to true
  $('.returnedCheckbox').on('click', function(e) {
    for (var y = 0; y < itemReturnedToLender.length; y++) {
      trackersRef.child(transIdBorrowed[y] + "/itemReturned/").set(true);

    }
  });

  //makes lent half "lentOut" values = false
  for (var v = 0; v < myItemReceived.length; v++) {
    console.log(upcBorrowed[v]);
    if (myItemReceived[v] && itemReturnedFromBorrower[v]) {
      itemsRef.child(upcLentOut[v] + '/lentOut/').set(false);
    }
  };

  //makes borrowed half "lentOut" values = false
  for (var w = 0; w < itemReceivedFromFriend.length; w++) {
    console.log(upcBorrowed[w]);
    if (itemReceivedFromFriend[w] && itemReturnedToLender[w]) {
      itemsRef.child(upcBorrowed[w] + '/lentOut/').set(false);
    };
  };
}


window.onload = function () {
  //to load html table before js is called
  var table = new Polonius();
  table.renderValues();
};
