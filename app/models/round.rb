class Round < ApplicationRecord
    after_save :start_new_round, if: :ended?

    before_create :set_default_votes

    belongs_to :game
    belongs_to :eliminated_player, class_name: "User", optional: true

    enum :status, {started: 0, ended:1}

    def start_new_round
      game.assign_new_round
    end
 
  
  def vote_out_spy
    vote_count_hashMap = {}

    voter_ids = votes.map { |v, _| v }
    voter_ids.each { |id| vote_count_hashMap[id] = 0 }

    votes.each do |_, voted_id|
      vote_count_hashMap[voted_id] += 1 unless voted_id.nil?
    end
    
    max_votes = -1
    voted_out_id = nil

    votes = vote_count_hashMap.values
    
    vote_count_hashMap.each do |player_id, count|
      if count > max_votes
        max_votes = count
        voted_out_id = player_id
      end
    end
   
    players_with_max = vote_count_hashMap.select { |_, count| count == max_votes }.keys

    if players_with_max.size > 1
      broadcast_round_draw
      self.status = :ended
      self.eliminated_player_id = nil
      save!
      game.get_shuffle_hint_player_turn
      return
    else
      voted_out_position = nil
      game.players_hash.each do |key, value|
        user_id = value[0]
        if user_id && user_id.to_s == voted_out_id.to_s
          voted_out_position = key
          break
        end
      end

      self.eliminated_player_id = voted_out_id
      self.status = :ended
      save!
      game.kill_player(voted_out_position.to_s)  
    end
  end


  def vote_display_modal
    user_ids = game.players_hash.values.map(&:first).compact
    users = User.where(id: user_ids)
    @user_to_email = {}
    users.each do |user|
      @user_to_email[user.id] = user.email
    end
    broadcast_vote_modal
  end
  
  def get_vote_broadcast_to_all(voter_id, voted_id)
    @voter_id = voter_id
    @voted_id = voted_id
    vote_broadcast_to_all
  end
  
  private

  def vote_broadcast_to_all
      ActionCable.server.broadcast(
        "room_#{game.room_id}_channel",
        {
          voter_id: User.find(@voter_id).email,
          voted_id: User.find(@voted_id).email
        }
      )
    end


  def broadcast_round_draw
    ActionCable.server.broadcast(
        "room_#{game.room_id}_channel",
        {
          roundDraw:true,
          roomId:game.room_id
        }
      )
  end

   def broadcast_vote_modal
    ActionCable.server.broadcast(
        "room_#{game.room_id}_channel",
        {
          vote_modal:true,
          user_to_email: @user_to_email,
          player_hash:  game.players_hash.select { |_, (user_id, status)| user_id && status == "alive" },
          roundId:id,
          roomId:game.room_id
        }
      )
    end

    def set_default_votes
      return unless game&.players_hash.present?
      
      # Create hash where each alive player has nil as their vote
      self.votes = {}
    
      game.players_hash.each do |_player_key, (user_id, status)|
          if user_id && status == "alive"
            self.votes[user_id.to_s] = nil
          end
      end
    end

end
