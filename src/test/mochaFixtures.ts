import hre from "hardhat";

module.exports = async function () {
    console.log("what");
    this.users = await hre.getUsers();
};
