pragma solidity ^0.4.4;

contract StateHolder {
    address public owner;

    uint   public openNumber;
    string public openString;
    string public myString;

   modifier onlyOwner() {
        require (msg.sender == owner);
        _;
    }

    function StateHolder() public {
        owner = msg.sender;
    }

    function changeOpenNumber(uint _newNumber) public {
        openNumber = _newNumber;
    }

    function changeOpenString(string _newString) public {
        openString = _newString;
    }

    function changeMyString(string _newString) public onlyOwner() {
        myString = _newString;
    }
}
