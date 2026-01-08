import consumer from "./consumer"

window.subscribeToRoom = roomId => {
  window.roomSubscription = consumer.subscriptions.create(
    { channel: "RoomChannel", room_id: roomId },
    {
      received(data) {
        if (data.players_html) {
          if (window.location.pathname !== `/rooms/${roomId}`){
            return;
          }
          $("#players").html(data.players_html);
        }
        if (data.player_count !== undefined) $(`[data-room-count-id='${roomId}']`).text(`${data.player_count}/6`);
        data.show_start_button ? renderStartButton(data.button_data) : $("#button-container").empty();
        if (data.show_game_data) showGameModal(data.modal_game_data);
        if (data.shuffled_player_hash) turnFunction(data);
        if (data.eliminated_modal) eliminated_modal(data)
        if (data.show_words) showSpyModal(data.modal_words_data);
        if (data.show_result) showGameResult(data.modal_result_data);
        if (data.vote_modal) vote_modal(data)
        if (data.voter_id) updateVoteModal(data)
        if (data.roundDraw) roundDrawModal(data) 
      }
    }
  );

  return window.roomSubscription;
};


const getCurrentUserId = () => window.gameData?.currentUserId || null;

function renderStartButton({ owner_id, game_id }) {
  if (owner_id != getCurrentUserId()) return $("#button-container").empty();

  $("#button-container").html(`
    <form class="button_to" method="post" action="/games/${game_id}/start">
      <input type="submit" value="Start Game" 
        class="btn btn-success btn-lg start-btn" 
        data-turbo-prefetch="false" />
    </form>
  `);
}

function showRestartModal() {
  const modalHtml = `
    <div id="game-result-modal" class="modal fade show"
         style="display: block; background-color: rgba(0,0,0,0.5);"
         tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">Restarting Game in</h5>
          </div>
          <div class="modal-body text-center">
            <h1 id="restart-countdown">5 sec</h1>
          </div>
        </div>
      </div>
    </div>
  `;

  $("body").append(modalHtml);
  
  const $roomElement = $("#room-id");
  const roomId = $roomElement.data("room-id");

  let timeLeft = 5;

  const interval = setInterval(() => {
    timeLeft--;
    $("#restart-countdown").text(timeLeft + " sec");

    if (timeLeft <= 0) {
      clearInterval(interval);
      $("#game-result-modal").remove();
      $("#game-info").hide().empty();
    }
  }, 1000);
  setTimeout(() => {
     fetch(`/rooms/${roomId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
        },
        body: JSON.stringify({ restart_game: true })
      });
  }, 5000);
}

function showGameModal({ spy_id, villagers_word, category }) {
  const isSpy = getCurrentUserId() && spy_id && getCurrentUserId() == spy_id;
  const wordToShow = isSpy ? "---" : villagers_word;
  const $roomElement = $("#room-id");
  const roomId = $roomElement.data("room-id");
  
  if (window.location.pathname !== `/rooms/${roomId}`) return;
  
  $("#game-start-modal").remove();
  
  const modalHtml = `
    <div id="game-start-modal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">Game has started!</h5>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3"><h5><strong>Category:</strong> ${category}</h5></div>
            <div class="mb-3">
              <h4><strong>Your Word:</strong></h4>
              <h2 class="text-primary">${wordToShow}</h2>
            </div>
            ${isSpy ? '<p class="text-danger"><strong>You are the SPY!</strong></p>' : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  $("body").append(modalHtml);
  
  $("#game-info").show().html(`
    <div class="card shadow-sm p-3">
      <h4 class="mb-3">Category: ${category}</h4>
      <h3 class="fw-bold">${wordToShow}</h3>
      ${isSpy ? '<p class="text-danger mt-2"><strong>You are the SPY!</strong></p>' : ''}
    </div>
  `);

  setTimeout(() => { 
    $("#game-start-modal").fadeOut(300, function() { 
      $(this).remove(); 
    }); 
  }, 5000);
}

function vote_modal({ player_hash, user_to_email, roundId, roomId}) {

  if (window.location.pathname !== `/rooms/${roomId}`) return;
  $("#voteOutModal").remove();

  const currentUserId = getCurrentUserId();
  let selectedVotedId = null; 

  let voteModalInterval = null;
  let autoHideTimeout = null;

  if (voteModalInterval) {
    clearInterval(voteModalInterval);
    voteModalInterval = null;
  }
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout);
    autoHideTimeout = null;
  }

  function VoteOut(votedId) {
    $(".confirm").remove()
    fetch(`/rounds/${roundId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
      },
      body: `voterId=${encodeURIComponent(currentUserId)}&votedId=${encodeURIComponent(votedId)}`
    });
  }

  let isCurrentUserAlive = false;

  Object.values(player_hash).forEach(([userId, status]) => {
    if (userId === currentUserId && status !== "killed") {
      isCurrentUserAlive = true;
    }
  });

  if (!isCurrentUserAlive) return;

  let timeLeft = 30;
  const modalHTML = `
    <div id="voteOutModal" class="modal fade show"
         style="display:block; background-color: rgba(0,0,0,0.5);"
         tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white" 
            style="display:flex; justify-content:space-between; align-items:center;">
            <h5 class="modal-title">🕵️ Vote out the Spy!</h5>
            <span id="vote-timer" style="display:inline-block;text-align:center;border:2px solid red;color:red;background-color:white;font-weight:bold;border-radius:50%;padding:0.5rem;width:3rem;">${timeLeft}</span>
          </div>
          <div class="modal-body text-center">
            <p class="mb-3">Vote Out a Player</p>

            <div class="players-container"
                 style="display:flex; flex-wrap:wrap; gap:0.5rem;">
              ${Object.keys(player_hash).map(playerKey => {
                const [userId] = player_hash[playerKey];
                if (userId !== currentUserId) {
                  const email = user_to_email[userId] || "Unknown";
                  return `
                    <button
                      class="vote-btn btn btn-outline-dark fs-6 p-2 w-100"
                      data-user-id="${userId}">
                      Player ${playerKey} (${email})
                    </button>
                  `;
                }
              }).join("")}
            </div>
            <button class="confirm btn btn-danger mt-3">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  $("body").append(modalHTML);

  voteModalInterval = setInterval(() => {
    if (timeLeft >= 0) {
      $("#vote-timer").text(timeLeft);
      timeLeft--;
    } else {
      clearInterval(voteModalInterval);
      voteModalInterval = null;
    }
  }, 1000);

  $(".vote-btn").on("click", function () {
    $(".vote-btn").removeClass("btn-dark").addClass("btn-outline-dark");
    $(this).removeClass("btn-outline-dark").addClass("btn-dark");

    selectedVotedId = $(this).data("user-id"); 
  });

  $(".confirm").on("click", function () {
    VoteOut(selectedVotedId);
  });

  autoHideTimeout = setTimeout(() => {
    $("#voteOutModal").fadeOut(300, function () {
      $(this).remove();
      if(getCurrentUserId() == 10){
      fetch(`/rounds/${roundId}/vote_out`,{
        method:'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json", 
          "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
        },
        body: JSON.stringify({})
      })
    }
    });
    clearInterval(voteModalInterval); 
  }, 30000);
}

function updateVoteModal({voter_id,voted_id}) {
  const modal = $("#voteOutModal");

  const modalBody = modal.find(".modal-body");
  if (!modal.find("#voteTable").length) {
    const tableHTML = `
      <div class="mt-4">
        <table id="voteTable" class="table table-bordered text-center">
          <thead class="table-dark">
            <tr>
              <th>Voter</th>
              <th>Voted</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    modalBody.append(tableHTML);
  }

  modal.find("#voteTable tbody").append(`
    <tr>
      <td>${voter_id}</td>
      <td>${voted_id}</td>
    </tr>
  `);
}

let turnFunctionTimeoutIds = [];

function turnFunction({shuffled_player_hash, delay, game_id, owner_id}){
  turnFunctionTimeoutIds.forEach(id => clearTimeout(id));
  turnFunctionTimeoutIds = [];
  
  let isRunning = true; 
  
  function highlightPlayer(index) {
 
    if (!isRunning) return;
 
    if (!shuffled_player_hash || index >= shuffled_player_hash.length) {
      if(getCurrentUserId() == owner_id){
        fetch(`/games/${game_id}/vote_modal`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json", 
            "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
          },
          body: JSON.stringify({})
        })
        .then(response => {
          if (!response.ok) {
            console.error("Failed to show vote modal");
          }
        })
        .catch(error => {
          console.error("Error showing vote modal:", error);
        });
      }
      return; 
    }  

    const user_id = shuffled_player_hash[index];
    const playerDiv = document.querySelector(`.player-slot[data-user-id='${user_id}']`);
    const originalText = $(`.player-slot[data-user-id='${user_id}'] .position-label`).text();

    if (playerDiv) {
      const originalBg = playerDiv.style.backgroundColor;

      let delayBeforeGold = 0;
     
       if (index === 0) delayBeforeGold = 5000; 
       
      const goldTimeout = setTimeout(() => {
        playerDiv.style.backgroundColor = "gold";
        $(`.player-slot[data-user-id='${user_id}'] .position-label`).text("Your Turn To Speak");
        $(`.player-slot[data-user-id='${user_id}'] .position-label`).text("Your Turn To Speak");
        
        // Create and start countdown timer
        const playerInfoDiv = playerDiv.querySelector('.player-info');
        const timerSpan = document.createElement('span');
        timerSpan.className = 'speak-timer';
        timerSpan.textContent = '30';
        
        if (playerInfoDiv) {
          playerInfoDiv.appendChild(timerSpan);
        }
        
        let timeLeft = 30;
        const timerInterval = setInterval(() => {
          timeLeft--;
          timerSpan.textContent = timeLeft;
          
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
          }
        }, 1000);

        const revertTimeout = setTimeout(() => {
          playerDiv.style.backgroundColor = originalBg;
          $(`.player-slot[data-user-id='${user_id}'] .position-label`).text(originalText);
          const existingTimer = playerDiv.querySelector('.speak-timer');
          if (existingTimer) {
            existingTimer.remove();
          }
          highlightPlayer(index + 1);
        }, 30000); // gold duration
        
        turnFunctionTimeoutIds.push(revertTimeout);
        
      }, delayBeforeGold);
      
      turnFunctionTimeoutIds.push(goldTimeout);
    } else {
      console.warn("No div found for user_id:", user_id);
      setTimeout(() => highlightPlayer(index + 1), 100);
    }
  }

  highlightPlayer(0);
  
  return function cleanup() {
    isRunning = false;
    turnFunctionTimeoutIds.forEach(id => clearTimeout(id));
    turnFunctionTimeoutIds = [];
  };
}

function eliminated_modal({player_key,player_email,room_id}){
  if (window.location.pathname !== `/rooms/${room_id}`) return;
  const modalHTML = `
      <div id="spyModal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">🔪 Player ${player_key} has been eliminated!</h5>
            </div>
            <div class="modal-body text-center">
              <h6>Player ${player_email} has been eliminated !</h6>
            </div>
          </div>
        </div>
      </div>
    `;
    $("#spyModal").remove();
    $("body").append(modalHTML);
     setTimeout(() => { 
      $("#spyModal").fadeOut(300, function() { 
        $(this).remove(); 
       }); 
    }, 5000);
}

function showSpyModal({spy_id, words_list, game_id}) {
  const isSpy = getCurrentUserId() && spy_id && getCurrentUserId() == spy_id;
  
  if (isSpy) {
    let timeLeft = 30; 
    const modalHTML = `
      <div id="spyModal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white" 
            style="display:flex; justify-content:space-between; align-items:center;">
            <h5 class="modal-title">🕵️ You have been eliminated!</h5>
            <span id="spy-timer" style="display:inline-block;text-align:center;border:2px solid red;color:red;background-color:white;font-weight:bold;border-radius:50%;padding:0.5rem;width:3rem;">${timeLeft}</span>
          </div>
            <div class="modal-body text-center">
              <p class="mb-3">Select a word</p>
              <div class="row g-2">
                ${words_list.map((word, index) => `
                  <div class="col-6">
                    <button type="button" class="btn btn-outline-dark fs-6 p-2 w-100 mb-2 spy-word-btn" data-word="${word}">
                      ${word}
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    $("#spyModal").remove();
    $("body").append(modalHTML);

    let spyModalTimer = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        $("#spy-timer").text(timeLeft);
      } else {
        clearInterval(spyModalTimer);
      }
    }, 1000);

    $(".spy-word-btn").on("click", function() {
      const selectedWord = $(this).data("word");

      $(".spy-word-btn").prop("disabled", true);
      $(this).removeClass("btn-outline-dark").addClass("btn-success");
      
      $.ajax({
        url: `/games/${game_id}`,
        method: 'PATCH',
        data: { spy_word_guess: selectedWord },
        headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') },
        success: function(response) {
          clearInterval(spyModalTimer); 
          $("#spyModal").fadeOut(300, function() { 
            $(this).remove(); 
          });
        },
        error: function(xhr, status, error) {
          console.error('Error submitting spy word guess:', error);
          $(".spy-word-btn").prop("disabled", false);
          $(this).removeClass("btn-success").addClass("btn-outline-dark");
        }
      });
    });

    const $roomElement = $("#room-id");
    const roomId = $roomElement.data("room-id");

    setTimeout(() => { 
      clearInterval(spyModalTimer); 
      $("#spyModal").fadeOut(300, function() { 
        $(this).remove(); 
        fetch(`/rooms/${roomId}/timeout`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
          },
          body: JSON.stringify({ restart_game: true })
        });
      }); 
    }, 30000);
  }
}

function showGameResult({ villagers_word, result ,selected_word}) {
  const $roomElement = $("#room-id");
  const roomId = $roomElement.data("room-id");
  if (window.location.pathname !== `/rooms/${roomId}`) return;
  const resultText = result === "spy_won" 
    ? "The Spy has WON!" 
    : "The Villagers have WON!";

  const resultClass = result === "spy_won" ? "bg-danger" : "bg-success";

  const modalHtml = `
    <div id="game-result-modal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header ${resultClass} text-white">
            <h5 class="modal-title">Game Over</h5>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <h4><strong>${resultText}</strong></h4>
            </div>
            <div class="mb-3">
              <h5><strong>Villagers' Word:</strong></h5>
              <h2 class="text-primary">${villagers_word}</h2>
              <h5><strong>Spy Selected Word:</strong></h5>
              <h2 class="text-primary">${selected_word ? selected_word : '----'}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("#game-result-modal").remove();
  $("body").append(modalHtml);

  setTimeout(() => {
    $("#game-result-modal").fadeOut(300, function() { $(this).remove(); });
      showRestartModal()
  }, 5000);
}

function roundDrawModal({roomId}){
  if (window.location.pathname !== `/rooms/${roomId}`) return;
  const modalHtml = `
    <div id="game-result-modal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">Round Draw</h5>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <h2><strong>Round Draw !</strong></h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("#game-result-modal").remove();
  $("body").append(modalHtml);

  setTimeout(() => {
    $("#game-result-modal").fadeOut(300, function() { $(this).remove(); });
  }, 5000);
}

