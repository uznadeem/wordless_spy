import consumer from "./consumer"

window.subscribeToRoom = roomId => consumer.subscriptions.create(
  { channel: "RoomChannel", room_id: roomId },
  {
    received(data) {
      if (data.players_html) $("#players").html(data.players_html);
      if (data.player_count !== undefined)
        $(`[data-room-count-id='${roomId}']`).text(`${data.player_count}/6`);

      data.show_start_button ? renderStartButton(data.button_data) : $("#button-container").empty();
      if (data.show_game_data) showGameModal(data.modal_game_data);
      if (data.show_words) showSpyModal(data.modal_words_data);
      if (data.show_result) showGameResult(data.modal_result_data);
      if (data.show_knife_button) showKnifeButton(data.knife_button_data)
    }
  }
);

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

function showGameModal({ spy_id, villagers_word, category }) {
  const isSpy = getCurrentUserId() && spy_id && getCurrentUserId() == spy_id;
  const wordToShow = isSpy ? "---" : villagers_word;

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
  
  $("#game-start-modal").remove();
  $("body").append(modalHtml);
  setTimeout(() => { $("#game-start-modal").fadeOut(300, function() { $(this).remove(); }); }, 5000);

  $("#game-info").html(`
    <div class="card shadow-sm p-3">
      <h4 class="mb-3">Category: ${category}</h4>
      <h3 class="fw-bold">${wordToShow}</h3>
    </div>
  `);
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
    
    // Auto-hide after 30 seconds (increased time for selection)
    setTimeout(() => { 
      $("#spyModal").fadeOut(300, function() { 
        $(this).remove(); 
      }); 
    }, 30000);
  }
}

function showGameResult({ villagers_word, result }) {
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