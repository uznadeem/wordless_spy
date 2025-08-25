class Game < ApplicationRecord
  ALLOWED_TRANSITIONS = {
    "room_assigned" => "started",
    "started"       => "finished"
  }.freeze

  validate :status_transition_is_valid, if: :will_save_change_to_status?

  after_save :start_new_game, if: :finished?

  has_one :spy, class_name: "User"

  belongs_to :room

  enum :status, { room_assigned: 0, started: 1, finished: 2 }
  enum :result, { spy_won: 0, spy_lost: 1 }

  def join_game(player)
    return errors.add(:base, "You are already in this room.") && false if players_hash.value?([ player, "alive" ])

    slot = players_hash.key([ nil, "alive" ])
    return errors.add(:base, "The room is full. You cannot join.") && false unless slot

    players_hash[slot] = [ player, "alive" ]
    save && broadcast_players_update
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

    update!(status: :started, category: category, words_list: word_list, villagers_word: word_list.sample, spy_id: players_hash.values.map { |h| h[0] }.sample)

    broadcast_game_start_modal
  end

  def kill_player(slot)
    if players_hash[slot][0] == spy_id
      broadcast_words_to_spy
    else
      players_hash[slot][1] = "killed"

      if players_hash.values.count { |h| h[1] == "alive" } == 2
        finish_game("spy_won")
      end
      save
      broadcast_players_update
    end
  end

  def spy_guess_word(selected_word)
    if selected_word == villagers_word
      finish_game("spy_won")
    else
      players_hash.find { |_, v| v[0] == spy_id }&.last[1] = "killed"
      finish_game("spy_lost")
    end
  end

  private

  def status_transition_is_valid
    from, to = status_change_to_be_saved
    errors.add(:status, "cannot transition from #{from} to #{to}") unless ALLOWED_TRANSITIONS[from] == to
  end

  def start_new_game
    room.assign_new_game
  end

  def finish_game(result)
    self.status = :finished
    self.result = result
    save
    broadcast_result
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
        player_count: player_count
      }
    )
    broadcast_knife_button
    broadcast_start_button
  end

  def broadcast_start_button
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_start_button: !players_hash.values.map { |h| h[0] }.any?(nil) && status != "started",
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
        modal_result_data: {
          villagers_word: villagers_word,
          result: result
        }
      }
    )
  end

  def broadcast_knife_button
    ActionCable.server.broadcast(
      "room_#{room_id}_channel",
      {
        show_knife_button: true,
        knife_button_data: {
          players_hash: players_hash,
          game: { id: self.id }
        }
      }
    )
  end
end
