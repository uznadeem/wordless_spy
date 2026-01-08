class Game < ApplicationRecord
  ALLOWED_TRANSITIONS = {
    "room_assigned" => "started",
    "started"       => "finished"
  }.freeze

  validate :status_transition_is_valid, if: :will_save_change_to_status?

  after_save :assign_new_round, if: :started?
  after_save :start_new_game, if: :finished?

  has_one :spy, class_name: "User"
  has_one :current_round, class_name: "Round", foreign_key: "id", primary_key: "current_round_id"

  has_many :rounds

  belongs_to :room

  enum :status, { room_assigned: 0, started: 1, finished: 2 }
  enum :result, { spy_won: 0, spy_lost: 1 }

  def assign_new_round
    update_columns(current_round_id: rounds.create!.id)
  end 

  def restart_game(previous_game) 
    previous_game.players_hash.each do |slot, value|
      players_hash[slot][0] = value[0]  
    end    
    save
    broadcast_players_update
  end

  def join_game(player)
    return true if players_hash.values.any? { |id, _| id == player }
    if status == "started"
      return errors.add(:base, "Game has started. You cannot join the game !.") && false  
    end
    slot = players_hash.key([ nil, "alive" ])
    return errors.add(:base, "The room is full. You cannot join.") && false unless slot

    players_hash[slot] = [ player, "alive" ]
    if save
      broadcast_players_update
      broadcast_start_button
      true  
    else
      false
    end

  end

  def leave_game(player)
    if (slot = players_hash.key([ player, "alive" ]))
      players_hash[slot] = [ nil, "alive" ]
      save
      broadcast_players_update
    end
  end

  def initialize_new_game
     chat_service = OpenAiWordService.new
     data = chat_service.fetch_words

    category = data.keys.first
    word_list = data[category]
    @delay = true

    update!(status: :started, category: category, words_list: word_list, villagers_word: word_list.sample, spy_id:  players_hash.values.map { |h| h[0] }.compact.sample)

    broadcast_game_start_modal
    broadcast_shuffle_hint_player_turn
  end

  def kill_player(slot)
    return unless slot && players_hash[slot]
    if players_hash[slot][0] == spy_id
      broadcast_words_to_spy
    else
      players_hash[slot][1] = "killed"
      @player_key = slot
      @player_email = User.find(players_hash[slot][0]).email
      @delay = false
      if players_hash.values.count { |h| h[0] && h[1] == "alive" } == 2
        finish_game("spy_won")
        return
      end
        save
        broadcast_player_eliminated_modal
        broadcast_players_update
        broadcast_shuffle_hint_player_turn
    end
  end

  def spy_guess_word(selected_word)
    if selected_word == villagers_word
      finish_game("spy_won", selected_word)
    else
      players_hash.find { |_, v| v[0] == spy_id }&.last[1] = "killed"
      finish_game("spy_lost", selected_word)
    end
  end

  def get_shuffle_hint_player_turn
    broadcast_shuffle_hint_player_turn
  end
  private

  def status_transition_is_valid
    from, to = status_change_to_be_saved
    errors.add(:status, "cannot transition from #{from} to #{to}") unless ALLOWED_TRANSITIONS[from] == to
  end

  def start_new_game
    room.assign_new_game
  end

  def finish_game(result, selected_word = nil)
    self.status = :finished
    self.result = result
    @spy_selected_word = selected_word
    broadcast_result
    save
  end

   
  def vote_display_modal
    current_round.vote_display_modal
  end

  def broadcast_player_eliminated_modal
       ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        eliminated_modal:true,
        player_key: @player_key,
        player_email: @player_email,
        room_id: room_id
      }
    )
  end

  def broadcast_players_update
    player_count = players_hash.values.map { |h| h[0] }.compact.size
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        players_html: ApplicationController.renderer.render(
          partial: "rooms/player_list",
          locals: {
            players_hash: players_hash,
            game: self
          }
        ),
        player_count: player_count,
        roomId:room_id
      }
    )
    broadcast_start_button
  end

  def broadcast_start_button
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_start_button: players_hash.values.map { |h| h[0] }.compact.size >= 3 && status == "room_assigned",
        button_data: {
          game_id: id,
          owner_id: players_hash["1"][0]
        }
      }
    )
  end

  def broadcast_game_start_modal
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_game_data: true,
        modal_game_data: {
          spy_id: spy_id,
          category: category,
          villagers_word: villagers_word
        }
      }
    )
  end

  def broadcast_shuffle_hint_player_turn
      h = players_hash.values.select { |user_id, status| status != "killed" }.map{ |user_id, status| user_id }.compact.shuffle
      ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        game_id: id,
        shuffled_player_hash: h,
        owner_id: players_hash["1"][0],
        delay: @delay
      }
    )
  end

  def broadcast_words_to_spy
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_words: true,
        modal_words_data: {
          words_list: words_list,
          spy_id: spy_id,
          game_id: id
        }
      }
    )
  end

  def broadcast_result
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_result: true,
        owner_id: players_hash["1"][0],
        modal_result_data: {
          villagers_word: villagers_word,
          result: result,
          selected_word: @spy_selected_word
        }
      }
    )
  end

end
