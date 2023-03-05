import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import axios from 'axios';
import { useState, useEffect } from 'react';

import { sepolia } from './chainConfig';
import { awayLists } from './giveAwayList';
import { MEMBERSHIP_BEGINNER, MEMBERSHIP_LEGEND, MEMBERSHIP_PRO } from './memberShipConfig';
const ABI = require("./abi.json");
const testUsers = require("./users.json");
const contractAddress = "0xcd3fafdfa2f8191bf7540fdf3654756e3ab4c718";

const storeAddress = "0x2f054f080ac46470517ad515e0b7f3cd52728fe3";
const storeABI = require("./storeABI.json");

const draws = [0, 0, 0, 0, 0, 1, 2, 2, 3, 6, 6, 6, 6, 8];

function App() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentRandom, setCurrentRandom] = useState(null);
  const [currentDraw, setCurrentDraw] = useState(null);
  const [chainLinkRandomNumber, setChainLinkRandomNumber] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentAwardedUsers, setAwardedUsers] = useState([]);

  const [index, setIndex] = useState(0);

  const saveToBlockchain = async () => {
    var web3 = new Web3(provider);
    var contract = new web3.eth.Contract(storeABI, storeAddress);
    console.log(currentAwardedUsers, index);
    let userData = [];
    for (let i = 0; i < currentAwardedUsers.length; i++) {
      userData.push({
        id: String(currentAwardedUsers[i].id),
        title: awayLists[draws[i]].title
      })
    }
    console.log(userData);
    await contract.methods.addHistory(index, userData).send({ from: address, to: storeAddress, value: 0 });
    alert("successfully stored in ", storeAddress);

  }
  const getRandomNumberFromChainLink = async () => {
    // requestRandomWords
    var web3 = new Web3(provider);
    var contract = new web3.eth.Contract(ABI, contractAddress);




    const requestId = await contract.methods.lastRequestId().call();

    console.log("requestId", requestId);

    const randoms = await contract.methods.getRequestStatus(requestId).call();

    console.log("randoms", randoms);




    let sum = 0;
    for (let i = 0; i < randoms.randomWords[0].length; i++) {
      sum = sum + Number(randoms.randomWords[0][i]);
    }

    await contract.methods.requestRandomWords().send({
      from: address,
      to: contractAddress,
      value: 0,
    });

    setChainLinkRandomNumber(sum);

  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  const generateRandomNumber = async (range) => {

    await sleep(1000);
    return (Math.floor(Math.random() * chainLinkRandomNumber * range)) % range;
    // return (Math.floor(Math.random() * range)) % range;
  }
  const fetchUserMembership = async (userId) => {
    try {
      const res = await axios.get(`https://www.uscreen.io/publisher_api/v1/customers/${userId}/accesses`, {
        headers: {
          authorization: process.env.REACT_APP_API
        }
      });

      return res.data[0].product_id;
    } catch (err) {
      // console.log(err, userId);
      return null;
    }
  }
  const fetchUserDataByPage = async (pageNumber) => {
    const res = await axios.get(`https://www.uscreen.io/publisher_api/v1/customers?page=${pageNumber}`, {
      headers: {
        authorization: process.env.REACT_APP_API
      }
    });

    if (res.data.length == 0) return null;
    else {
      let filteredUser = [];
      for (let user of res.data) {

        if (user.subscriber == false) continue;

        let product_id = await fetchUserMembership(user.id);

        console.log(product_id);

        if (product_id == null) continue;

        else if (product_id == MEMBERSHIP_BEGINNER || product_id == MEMBERSHIP_LEGEND || product_id == MEMBERSHIP_PRO) {
          filteredUser.push({ ...user, product_id });
        }

      };
      return filteredUser;

    }
  }
  const fetchUsers = async () => {
    let page = 0;
    let tempUsers = [];
    while (true) {
      let res = await fetchUserDataByPage(page);
      if (res == null) break;
      tempUsers = [...tempUsers, ...res];
      page++;
    }
    // console.log("users", tempUsers);
    setUsers(tempUsers);
    return tempUsers;

  }
  const connectWallet = async () => {
    const { ethereum } = window;
    if (ethereum != undefined) {
      try {
        const res = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAddress(res[0]);
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: sepolia.chainId }], // chainId must be in hexadecimal numbers
          });
          setProvider(window.ethereum);

        } catch (err) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              sepolia,
            ],
          });
        }
      }
      catch (err) {

      }

    }
  }

  const giveAway = async () => {

    if (provider == null) {
      alert("Connect wallet");

    }
    else if (chainLinkRandomNumber == null) {
      alert("get Chain Link Number");

    }
    else {
      // const currentUsers = await fetchUsers();
      const currentUsers = testUsers;

      //console.log(currentUsers);
      const randomRange = currentUsers.length;
      const awardedUsers = [];
      let tempLogs = [];
      for (let i = 0; i < draws.length; i++) {
        //console.log("=================================", i);
        while (1) {
          let randomNumber = await generateRandomNumber(randomRange);

          setCurrentRandom(randomNumber);

          let user = currentUsers[randomNumber];



          let subscription = user.product_id;

          console.log("sub", subscription, user.id, randomNumber);

          setCurrentDraw({
            user: user,
            memberShip: subscription,
            title: awayLists[draws[i]].title
          });

          let flag = false;
          for (let awardedUser of awardedUsers) {
            if (awardedUser.id == user.id)
              flag = true;
          }
          if (flag == true)
            continue;

          if (awayLists[draws[i]].acceptLevel.indexOf(subscription) != -1) {


            tempLogs.push(`${user.name} ${user.id} (${subscription}) was awarded for ${awayLists[draws[i]].title}`);

            setLogs((log) => {
              return [...log, `${user.name} ${user.id}(${subscription}) was awarded for ${awayLists[draws[i]].title}`];
            })
            awardedUsers.push(user);
            break;
          }
        }
        setAwardedUsers(awardedUsers);
      }

    }

  }
  useEffect(() => {
    // giveAway();
  }, [])
  return (
    <div className="App">
      {address == null ? <button onClick={connectWallet}> connect wallet </button> : <p>wallet address:{address}</p>}
      {
        chainLinkRandomNumber == null ?
          <button onClick={getRandomNumberFromChainLink}> get chainLinkNumber</button> : <p>{chainLinkRandomNumber}</p>
      }
      <button onClick={giveAway}> start draw</button>


      <div>
        current random user number = {currentRandom}
        <div>current title:{currentDraw && currentDraw.title}</div>
        {currentDraw &&
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",


          }}>
            <div>name:{currentDraw.user.name}</div>
            <div>id:{currentDraw.user.id}</div>
            <div>memberShip:{
              (() => {
                if (currentDraw.memberShip == MEMBERSHIP_BEGINNER)
                  return "LEVEL 3";
                if (currentDraw.memberShip == MEMBERSHIP_PRO)
                  return "LEVEL 2";
                if (currentDraw.memberShip == MEMBERSHIP_LEGEND)
                  return "LEVEL 1";
              })()
            }, </div></div>
        }
      </div>

      "Logs:"
      <div>
        {
          logs.map((log, index) => {
            return <div style={{
              fontSize: "14px"
            }} key={index}>{log}</div>
          })
        }
      </div>
      <br></br>
      <div>
        draw Index : <input type="number" value={index} onChange={(e) => {
          setIndex(e.target.value);
        }} />
        <button onClick={saveToBlockchain}> save log</button>
      </div>
    </div>


  );
}

export default App;
