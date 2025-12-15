import "@hotwired/turbo-rails"
import "controllers"
import "bootstrap"
import "channels"
import "jquery"

$(function () {
  $('[data-bs-toggle="tooltip"]').each(function () {
    new bootstrap.Tooltip(this)
  })
})

window.roomSubscription = null;

$(document).on("turbo:load", function () {
  const $roomElements = $("[data-room-id]");
  if ($roomElements.length === 0) return; // no rooms on this page

  // Ensure we have a global object to store subscriptions
  if (!window.roomSubscriptions) window.roomSubscriptions = {};

  // Subscribe to each room
  $roomElements.each(function () {
    const roomId = $(this).data("room-id"); // get the room id
    if (!window.roomSubscriptions[roomId]) { // prevent duplicate subscription
      window.roomSubscriptions[roomId] = subscribeToRoom(roomId);
    }
  });
});

