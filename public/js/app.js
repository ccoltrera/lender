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
User.prototype.render =function() {
  var trackers, item, itemSpecific, transId, lentPerson, lentTable;
  var upc = []; //holds upc codes from tracked items
  var borrower = [];//holds borrower names for lent half of ledger
  var allItems = [];//stores every items key (upc)
  var owner = [];//stores the values of the owners that have been tracked
  var itemNames = [];//stores the itemDetails of tracked items


  //for trackers objects
  trackersRef.once('value', function(trackersSnapshot) {
    trackers = trackersSnapshot.val(); //should give objects with trackers titles
    //gets values within objects
    for (var transactionID in trackers) {
      //push to give arrays the values
      upc.push(trackers[transactionID].upc);
      borrower.push(trackers[transactionID].borrower);
    };
    // console.log(upc);
    // console.log('inside snapshot: ' + upc);
  });
  // console.log('Outside snapshot: ' + upc);

  //for items objects
  itemsRef.once('value', function(itemsSnapshot) {
    items = itemsSnapshot.val();
    //Object.keys will give the key values which = upc for all items
    var allItems = Object.keys(items);

    //matches inside snap of upc
    console.log('items snapshot: ' + upc);

    // console.log('tracked upc ' + upc);
    for (var k = 0; k < allItems.length; k++){
      for(var a = 0; a < upc.length; a++){
        //should find the values needed only from the upc codes that match
        if (allItems[k] == upc[a]) {
          // console.log('all item ' + allItems[k]);
          // console.log('tracked upc ' + upc[a]);
          //access the specified object that is being tracked
          var itemSpecific = items[upc[a]];
          console.log(itemSpecific);
          for (var itemsID in itemSpecific) {
            console.log(itemSpecific[itemsID].owner);
            console.log(itemSpecific[itemsID].itemDetails);
            owner.push(itemSpecific[itemsID].owner);
            itemNames.push(itemSpecific[itemsID].itemDetails);
          }
          k++;
          a++;
        }
      }
    }
    // console.log(owner);
    // console.log(itemNames)



    // while (upc[0] == ) {};
      for (var itemsID in items) {
        // console.log(items[itemsID].owner);
        // console.log(items[itemsID].itemDetails);
      }

  });

//table creations
  // for (b = 0; b < borrower.length; b++) {

    var table       = document.getElementById('lent-table');
    var tr          = document.createElement('tr');
    var td          = document.createElement('td');
    var newText     = document.createTextNode('some testing text');
    td.appendChild(newText);
    tr.appendChild(td);
  // }

  // $lentTable = $('lent-table')
  // $lentPerson = $(trackersRef)
  //for as many transactions there currently are

  // for (var j = 0; j < 1; j++) {

    // $newRow = $('<tr>').append('<td>' +'<input type="checkbox"></input>' + '</td>');
    // $lentTable.append($newRow);
  // }

};



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



//for testing purposes
var person = new User('Mike');
person.initialize();
person.createItem('baseball');
person.generateUPC('baseball')
person.render();
