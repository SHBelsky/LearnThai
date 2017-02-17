
'use strict';

controllers.controller('chapterSummaryCtrl',
  ['$scope', '$controller', '$rootScope', '$timeout','$location',
    function($scope, $controller, $rootScope, $timeout, $location) {

      /************************* scope variables ******************************/
      $scope.choices;
      $scope.questionString;
      $scope.audio;
      $scope.timeoutId = null;
      $scope.hasAnswered = false;
      $scope.score = 0;
      $scope.totalLife = 5;
      $scope.life = 5;
      $scope.audioRepeats = 0;
      $scope.btnReplay = "Replay this question";
      $scope.records = [];

      /************************* local variables ******************************/
      var timer;
      var canvas, ctx, source, context, analyser;
      var fbc_array, bars, bar_x, bar_y, bar_width, bar_height;
      var questions;
      var questionIdx = -1;
      var audio = document.getElementById('myAudio');
      var canvas = document.getElementById('analyser_render');
      var level = 0;
      var json_directory = 'json/';
      var jsons = ["level1", "level2", "level3"];
      var jsons_tests = ["level1_test", "level2_test", "level3"];
      var music_directory = '../../music/';
      var music_lst = ['level1', 'level2', 'level3'];
      var currAudioSource = document.getElementById('myAudioSource');

      /************************* functions ************************************/
      $timeout(function (){
        initMp3Player();
        $scope.pageLoad();
      },0.5);

      $scope.pageLoad = function (){
        $scope.getJSON(json_directory + jsons[level] + '.json', function(json) {
          // console.log('json " ', json);
          questionIdx = -1;
          questions = json;
          incQuestion();
          $timeout(function (){
            $scope.updateMainAudioSource();
            $scope.checkAnswer();
          },100);
        });
      };

      // $scope.aud_play = function () {
      //   var myAudio = document.getElementById("myAudio");
      //   if (myAudio.paused) {
      //     myAudio.play();
      //     $scope.audioRepeats += 1;
      //   }
      // };

      $scope.updateMainAudioSource = function() {
        var s = music_directory + music_lst[level] + '/' + $scope.audio;
        $scope.updateAudioSource(s);
      };

      $scope.updateAudioSource = function(s) {
        currAudioSource.src = s;
        // need to disconnect media element source from the previous audio
        // Re-route audio playback into the processing graph of the AudioContext
        source.connect(analyser);
        analyser.connect(context.destination);
        frameLooper();
        audio.pause();
        $timeout(function (){
          if (audio.paused) {
            audio.load(); //call this to just preload the audio without playing
            audio.play(); //call this to play the song right away
          }
        },1000);
      };

      /* Initialize the MP3 player after the page loads
       * all of its HTML into the window */
      function initMp3Player(){
        // AudioContext instance
        context = new (window.AudioContext || window.webkitAudioContext)();
        analyser = context.createAnalyser(); // AnalyserNode method
        canvas = document.getElementById('analyser_render');
        ctx = canvas.getContext('2d');

        // Re-route audio playback into the processing graph of AudioContext
        source = context.createMediaElementSource(audio);
      }

      /* frameLooper() animates any style of graphics you wish to
       * the audio frequency
       * Looping at the default frame rate that the browser
       * provides(approx. 60 FPS) */
      function frameLooper(){
        window.requestAnimationFrame(frameLooper);
        fbc_array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fbc_array);
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        ctx.fillStyle = '#c7d8c6'; // Color of the bars
        bars = 100;
        for (var i = 0; i < bars; i++) {
          bar_x = i * 4;
          bar_height = (fbc_array[i]/2 - 40)*1.4;
          bar_y = (canvas.height - bar_height)/2;
          bar_width = 2;
          if (bar_height < 0) {
            bar_height = 0;
          }
          // fillRect( x, y, width, height )
          ctx.fillRect(bar_x, bar_y, bar_width, bar_height);
        }
      }

      $scope.checkAnswer = function (){
        if($scope.timeoutId){
            $timeout.cancel($scope.timeoutId);
            $scope.timeoutId = null;
        }
        $scope.timeoutId = $timeout(function (){
          $("[is-correct='true']").one('click', function() {
            $scope.hasAnswered = true;
            if (! $(this).hasClass('hvr-push')) {
              $scope.score += 100;
            }
            $(this).addClass('hvr-push lt-correct-choice');
            $scope.nextQuestion();
            if (!$scope.$$phase) {
                $scope.$apply();
            }
          });
          $("[is-correct='false']").one('click', function() {
            if (!$scope.hasAnswered) {
              if (! $(this).hasClass('hvr-wobble-horizontal')) {
                $scope.life -= 1;
              }
              if (!$scope.$$phase) {
                $scope.$apply();
              }
              $(this).addClass('hvr-wobble-horizontal lt-wrong-choice');
              $("[is-correct='false']").addClass('lt-wrong-pics');
              $scope.hasAnswered = true;
              $("[is-correct='true']").addClass('hvr-push lt-correct-choice');
              $scope.nextQuestion();
            }
          });
        },100);
      };

      /* update question and audio */
      function nextQuestion_helper() {
        $scope.hasAnswered = false;
        incQuestion();
        $scope.updateMainAudioSource();
        $scope.checkAnswer();
      };

      function incQuestion() {
        // console.log('questionIdx: ', questionIdx);
        questionIdx += 1;
        $scope.questionString = questions[questionIdx].question;
        $scope.choices = questions[questionIdx].choices;
        $scope.audio = questions[questionIdx].audioWord;
      };

      $scope.nextQuestion = function() {
        if (questionIdx < questions.length - 1) {
          $timeout(function () {
            nextQuestion_helper();
          }, 1500);
        } else {
          $timeout(function () {
            nextLevel();
          }, 1500);
        }
      };

      /* parsing JSON file */
      function readTextFile(file, callback) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                callback(rawFile.responseText);
            }
        }
        rawFile.send(null);
      };

      $scope.getJSON = function(url, callback) {
        readTextFile(url, function(text){
          // console.log('json parse');
          callback(JSON.parse(text));
        });
      };

      function nextLevel() {
        if (level < jsons.length-1) {
          level += 1;
          $scope.pageLoad();
          load_history(level-1);
          // console.log($scope.records);
        }
      };

      /**************************** Summary Events ****************************/

      $scope.playRecord = function (chapter, record) {
        record = "../../music/level" + chapter + "/" + record;
        $scope.updateAudioSource(record);
      };

      $(document.body).on('mouseenter', '.lt-summary-picture', function(ev){
        var target = $(ev.target);
        target.addClass('lt-mouse-enter-pic');
      });

      $(document.body).on('mouseleave', '.lt-summary-picture', function(ev){
        var target = $(ev.target);
        target.removeClass('lt-mouse-enter-pic');
      });

      /**************************** Get Word History **************************/

      function load_history(level) {
        // console.log('load_history');
        var path = json_directory + music_lst[level] + '_summary.json';
        $scope.getJSON(path, function(json) {
          var new_chap =
            { chapter: level+1,
              words: json }
          $scope.records.push(new_chap);
        })
      }

    }
  ]);