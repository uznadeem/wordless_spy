import consumer from "./consumer"

window.subscribeToRoom = roomId => {
  window.roomSubscription = consumer.subscriptions.create(
    { channel: "RoomChannel", room_id: roomId },
    {
      received(data) {
        if (data.players_html) $("#players").html(data.players_html);
        if (data.player_count !== undefined) $(`[data-room-count-id='${roomId}']`).text(`${data.player_count}/6`);
        data.show_start_button ? renderStartButton(data.button_data) : $("#button-container").empty();
        if (data.show_game_data) showGameModal(data.modal_game_data);
        if (data.shuffled_player_hash) turnFunction(data)
        if (data.show_words) showSpyModal(data.modal_words_data);
        if (data.show_result) showGameResult(data.modal_result_data);
        if (data.show_knife_button) showKnifeButton(data.knife_button_data);
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
      fetch(`/rooms/${roomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json", 
          "X-CSRF-Token": document.querySelector("meta[name='csrf-token']").content
        },
        body: JSON.stringify({ restart_game: true })
      });
    }
  }, 1000);
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

function turnFunction({shuffled_player_hash, delay}){
  console.log("shuffled_player_hash: ", shuffled_player_hash, "delay:", delay);

  function highlightPlayer(index) {
    if (index >= shuffled_player_hash.length) return; // Stop when done

    const user_id = shuffled_player_hash[index];
    const playerDiv = document.querySelector(`.player-slot[data-user-id='${user_id}']`);
    const originalText = $(`.player-slot[data-user-id='${user_id}'] .position-label`).text();

    if (playerDiv) {
      const originalBg = playerDiv.style.backgroundColor;

      // determine delay before gold
      let delayBeforeGold = 0;
      if (index === 0 && delay == true) delayBeforeGold = 5000; // 5s only if first and delayNot is false

      // change to gold after delayBeforeGold
      setTimeout(() => {
        playerDiv.style.backgroundColor = "gold";
        $(`.player-slot[data-user-id='${user_id}'] .position-label`).text("Your Turn To Speak");
        // keep gold for 30s, then revert and move to next player
        setTimeout(() => {
          playerDiv.style.backgroundColor = originalBg;
        $(`.player-slot[data-user-id='${user_id}'] .position-label`).text(originalText);
          highlightPlayer(index + 1); // next player
        }, 3000); // gold duration
      }, delayBeforeGold);
    } else {
      console.warn("No div found for user_id:", user_id);
      highlightPlayer(index + 1); // Skip missing player
    }
  }

  // Start with the first player
  highlightPlayer(0);
}

function showSpyModal({spy_id, words_list, game_id}) {
  const isSpy = getCurrentUserId() && spy_id && getCurrentUserId() == spy_id;
  
  if (isSpy) {
    const modalHTML = `
      <div id="spyModal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">🕵️ You have been eliminated!</h5>
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
    
    // Handle word selection
    $(".spy-word-btn").on("click", function() {
      const selectedWord = $(this).data("word");

      // Disable all buttons and show loading state
      $(".spy-word-btn").prop("disabled", true);
      $(this).removeClass("btn-outline-dark").addClass("btn-success");
      
      // Send selected word to server
      $.ajax({
        url: `/games/${game_id}`,
        method: 'PATCH',
        data: {
          spy_word_guess: selectedWord
        },
        headers: {
          'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
        },
        success: function(response) {
          // Close modal after successful submission
          $("#spyModal").fadeOut(300, function() { 
            $(this).remove(); 
          });
        },
        error: function(xhr, status, error) {
          console.error('Error submitting spy word guess:', error);
          // Re-enable buttons on error
          $(".spy-word-btn").prop("disabled", false);
          $(this).removeClass("btn-success").addClass("btn-outline-dark");
        }
      });
    });
    const $roomElement = $("#room-id");
    const roomId = $roomElement.data("room-id");
    // Auto-hide after 30 seconds (increased time for selection)
    setTimeout(() => { 
      $("#spyModal").fadeOut(300, function() { 
        $(this).remove(); 
       // window.roomSubscription.perform("spy_modal_timeout", { room_id: window.currentRoomId });
        fetch(`/rooms/${roomId}/timeout`, {
          method: "POST",
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

function showKnifeButton({ players_hash, game }) {
  const currentUserId = getCurrentUserId();
  
  // Convert currentUserId to number for comparison (since players_hash has numbers)
  const currentUserIdNum = currentUserId ? parseInt(currentUserId) : null;
  
  // Check if current user is in position 1 (first seat)
  const positionOneData = players_hash["1"]; // This gives us [user_id, status]
  const positionOneUserId = positionOneData ? positionOneData[0] : null;
  
  console.log('Current User ID:', currentUserIdNum);
  console.log('Position 1 User ID:', positionOneUserId);
  console.log('Players Hash:', players_hash);
  
  if (!currentUserIdNum || !positionOneUserId || currentUserIdNum != positionOneUserId) {
    $(".knife-btn").remove();
    return;
  }
  
  $(".knife-btn").remove();
  
  Object.keys(players_hash).forEach(position => {
    const playerData = players_hash[position]; 
    const targetUserId = playerData[0]; 
    const playerStatus = playerData[1]; 
    
    if (targetUserId && playerStatus === "alive") {
      const playerSlot = $(`.player-slot[data-position="${position}"]`);
      const playerInfo = playerSlot.find('.player-info');
      
      const knifeButton = $(`
        <button type="button" class="knife-btn knife-action" data-user-id="${targetUserId}" data-target-seat="${position}">
          <span class="knife-icon">🔪</span>
        </button>
      `);

      knifeButton.on('click', function() {
        const targetSeat = $(this).data('target-seat');
        const targetUser = $(this).data('user-id');
        
        $(this).prop('disabled', true);
        
        $.ajax({
          url: `/games/${game.id}`,
          method: 'PATCH',
          data: {
            knife_action: "knife_target",
            target_seat: targetSeat
          },
          headers: {
            'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
          },
          success: function(response) {
            console.log('Knife action successful for user:', targetUser, 'in seat:', targetSeat);
          },
          error: function(xhr, status, error) {
            console.error('Error performing knife action:', error);
            knifeButton.prop('disabled', false);
          }
        });
      });
      
      playerInfo.append(knifeButton);
    }
  });
}