import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, CheckCircle, XCircle, Award, BrainCircuit, Sparkles, X, LoaderCircle } from 'lucide-react';

// BlurText Animation Component
const BlurText = ({
  text,
  delay = 0,
  animateBy = "words",
  direction = "top",
  onAnimationComplete,
  className,
}) => {
  const textParts = useMemo(() => {
    return animateBy === "words" ? text.split(" ") : text.split("");
  }, [text, animateBy]);

  const directionOffsets = {
    top: { y: -20 },
    bottom: { y: 20 },
    left: { x: -20 },
    right: { x: 20 },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: i, delayChildren: 0 },
    }),
  };

  const childVariants = {
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      ...directionOffsets[direction],
      filter: 'blur(8px)',
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      onAnimationComplete={onAnimationComplete}
      className={`flex flex-wrap ${className}`}
    >
      {textParts.map((part, index) => (
        <motion.span
          key={index}
          variants={childVariants}
          className="mr-[0.25em] last:mr-0" // Add space between words/letters
        >
          {part}
        </motion.span>
      ))}
    </motion.div>
  );
};


// Aurora Background Component
const Aurora = ({
  colorStops = ["#3A29FF", "#FF94B4", "#FF3232"],
  blend = 0.5,
  amplitude = 1.0,
  speed = 0.5,
}) => {
  const canvasRef = useRef(null);
  const shaderProgramRef = useRef(null);
  const bufferRef = useRef(null);
  const glRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    glRef.current = gl;

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_colors[3];
      uniform float u_blend;
      uniform float u_amplitude;
      uniform float u_speed;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;

        float time = u_time * u_speed * 0.1;
        
        vec2 pos = vec2(st * 3.0);
        float n = noise(pos + time);
        
        vec3 color = mix(u_colors[0], u_colors[1], smoothstep(0.3, 0.7, st.y + n * u_amplitude * 0.1));
        color = mix(color, u_colors[2], smoothstep(0.5, 0.9, st.y + n * u_amplitude * 0.2));

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return;
    }
    shaderProgramRef.current = shaderProgram;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    bufferRef.current = positionBuffer;

    let animationFrameId;
    const render = (time) => {
      time *= 0.001;
      
      const resizeCanvasToDisplaySize = (canvas) => {
        const { width, height } = canvas.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          return true;
        }
        return false;
      }
      
      if(!gl.canvas) return;
      resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);

      const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_position");
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

      const timeUniformLocation = gl.getUniformLocation(shaderProgram, "u_time");
      gl.uniform1f(timeUniformLocation, time);
      
      const colorsLoc = gl.getUniformLocation(shaderProgram, "u_colors");
      const colors = colorStops.flatMap(hex => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          return [r, g, b];
      });
      gl.uniform3fv(colorsLoc, colors);

      const blendLoc = gl.getUniformLocation(shaderProgram, "u_blend");
      gl.uniform1f(blendLoc, blend);

      const ampLoc = gl.getUniformLocation(shaderProgram, "u_amplitude");
      gl.uniform1f(ampLoc, amplitude);

      const speedLoc = gl.getUniformLocation(shaderProgram, "u_speed");
      gl.uniform1f(speedLoc, speed);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorStops, blend, amplitude, speed]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />;
};


// SVG Mascot Component -  with Blinking Eyes
const QuizBuddyMascot = ({ className, theme }) => (
    <motion.svg 
        viewBox="0 0 100 100" 
        className={className} 
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
        <defs>
            <linearGradient id="mascotBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor={theme === 'dark' ? "#a855f7" : "#c084fc"} />
                 <stop offset="100%" stopColor={theme === 'dark' ? "#ec4899" : "#f9a8d4"} />
            </linearGradient>
        </defs>
        
        {/* Main Body */}
        <path d="M84,40.5 C84,62.5 67,80 47.5,80 C28,80 11,62.5 11,40.5 C11,18.5 28,1 47.5,1 C67,1 84,18.5 84,40.5 Z" fill="url(#mascotBodyGradient)" />
        
        {/* Face Screen */}
        <rect x="22" y="22" width="51" height="35" rx="10" fill="white" />

        {/* Eyes */}
        <motion.circle 
            cx="38" 
            cy="40" 
            r="3" 
            fill="black" 
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.circle 
            cx="58" 
            cy="40" 
            r="3" 
            fill="black" 
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        />
        
        {/* Smile */}
        <path d="M42,48 C44,52 52,52 54,48" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Ear Pieces */}
        <path d="M11,30 C5,32 1,40 1,48 C1,56 5,64 11,66 L11,30 Z" fill="url(#mascotBodyGradient)" />
        <path d="M84,30 C90,32 94,40 94,48 C94,56 90,64 84,66 L84,30 Z" fill="url(#mascotBodyGradient)" />

        {/* Lightning Bolt */}
        <motion.path 
            d="M48,1 L48,8 L54,8 L46,18 L46,11 L40,11 L48,1 Z" 
            fill="#00BFFF"
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
    </motion.svg>
);


// Modal Component
const Modal = ({ title, content, onClose, isLoading }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                    <X />
                </button>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <LoaderCircle className="w-10 h-10 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</div>
            )}
        </motion.div>
    </motion.div>
);


// Main App Component
function App() {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizState, setQuizState] = useState('topic'); // 'topic', 'loading', 'quiz', 'results'
    const [theme, setTheme] = useState('dark');
    const [error, setError] = useState(null);
    const [modalContent, setModalContent] = useState(null); // {title, content, isLoading}


    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
    // Generic function to call Gemini API
    const callGemini = async (payload) => {
        const apiKey = "AIzaSyBJgqVaBRlfE_dqYlo1Vzo8JC5VfF9gRsA"; // API key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let attempt = 0;
        const maxAttempts = 5;
        while (attempt < maxAttempts) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody?.error?.message || 'Unknown error'}`);
                }

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    return result.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("No content generated or unexpected response structure.");
                }
            } catch (err) {
                console.error(`Attempt ${attempt + 1} failed:`, err);
                attempt++;
                if (attempt < maxAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw err; // Rethrow after final attempt
                }
            }
        }
    };

    const generateQuiz = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setQuizState('loading');
        setError(null);
        setUserAnswers({});
        setCurrentQuestionIndex(0);

        const prompt = `Generate a fun and engaging quiz with 10 multiple-choice questions about "${topic}" at a "${difficulty}" difficulty level. For each question, provide 4 options and clearly indicate the correct answer. The questions should be suitable for college students. Ensure the answer is one of the provided options.`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        questions: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    question: { type: "STRING" },
                                    options: { type: "ARRAY", items: { type: "STRING" } },
                                    answer: { type: "STRING" }
                                },
                                required: ["question", "options", "answer"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        };
        
        try {
            const jsonText = await callGemini(payload);
            const parsedJson = JSON.parse(jsonText);
            if (parsedJson.questions && parsedJson.questions.length > 0) {
                setQuestions(parsedJson.questions);
                setQuizState('quiz');
            } else {
                throw new Error("Invalid quiz data structure received.");
            }
        } catch (err) {
            setError(`Failed to generate quiz. ${err.message}`);
            setQuizState('topic');
        }
    };
    
    const getExplanation = async (question, answer) => {
        setModalContent({ title: "✨ Explanation", content: "", isLoading: true });
        const prompt = `Explain why "${answer}" is the correct answer for the following question. Keep the explanation concise and easy to understand for a college student.\n\nQuestion: "${question}"`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const explanationText = await callGemini(payload);
            setModalContent({ title: "✨ Explanation", content: explanationText, isLoading: false });
        } catch (err) {
            setModalContent({ title: "Error", content: `Could not fetch explanation: ${err.message}`, isLoading: false });
        }
    };

    const getDeepDive = async () => {
        setModalContent({ title: `✨ Deep Dive on ${topic}`, content: "", isLoading: true });
        const prompt = `Provide a brief, interesting summary of the key points about "${topic}" for a college student who just took a quiz on it.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const deepDiveText = await callGemini(payload);
            setModalContent({ title: `✨ Deep Dive on ${topic}`, content: deepDiveText, isLoading: false });
        } catch (err) {
            setModalContent({ title: "Error", content: `Could not fetch deep dive: ${err.message}`, isLoading: false });
        }
    };


    const handleAnswerSelect = (questionIndex, answer) => {
        setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setQuizState('results');
        }
    };

    const score = useMemo(() => {
        return questions.reduce((acc, question, index) => {
            return userAnswers[index] === question.answer ? acc + 1 : acc;
        }, 0);
    }, [questions, userAnswers, quizState]);

    const restartQuiz = () => {
        setTopic('');
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setQuizState('topic');
        setError(null);
    };

    const scorePercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    
    const handleAnimationComplete = () => {
        console.log('Animation completed!');
    };

    const renderContent = () => {
        switch (quizState) {
            case 'topic':
                return (
                    <div className="text-center">
                        
                        <motion.h1 
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
                            Welcome to Quiz Buddy!
                        </motion.h1>

                        <BlurText
                            text="What do you want to be quizzed on today?"
                            delay={0.15}
                            animateBy="words"
                            direction="top"
                            onAnimationComplete={handleAnimationComplete}
                            className="text-lg md:text-xl text-slate-800 dark:text-slate-400 mb-8 justify-center"
                        />
                        
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.8, duration: 0.5 }} className="mt-7 mb-6">
                            <h3 className="text-slate-600 dark:text-slate-300 mb-3 font-semibold">Select Difficulty</h3>
                            <div className="flex justify-center gap-2 sm:gap-4 p-1 rounded-xl bg-white/30 dark:bg-slate-800/50 w-fit mx-auto">
                                {['Easy', 'Medium', 'Hard'].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors duration-300 ${difficulty === level ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 1.1, duration: 0.5 }} // Increased delay to wait for text animation
                            className="flex flex-col sm:flex-col gap-4 justify-center items-center">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && generateQuiz()}
                                placeholder="e.g., 'The Roman Empire' or 'Quantum Physics'"
                                className="w-full sm:w-150 px-4 py-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-gray-700 focus:ring-4 focus:ring-pink-500/50 focus:border-pink-500 outline-none transition-all duration-300 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-300"
                            />
                            <button
                                onClick={generateQuiz}
                                className="w-full sm:w-80 px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                                Start Quiz!
                            </button>
                        </motion.div>

                        

                        {error && <p className="text-red-500 mt-4 animate-pulse">{error}</p>}
                    </div>
                );
            case 'loading':
                return (
                    <div className="text-center">
                        <QuizBuddyMascot className="w-40 h-40 mx-auto mb-4" theme={theme} />
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Generating your quiz...</h2>
                        <p className="text-slate-600 dark:text-slate-400">Our AI is crafting a {difficulty} quiz on {topic}!</p>
                    </div>
                );
            case 'quiz':
                const currentQuestion = questions[currentQuestionIndex];
                return (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-3xl"
                        >
                            <div className="p-8 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
                                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </p>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                                    {currentQuestion.question}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuestion.options.map((option, i) => (
                                        <motion.button
                                            key={i}
                                            onClick={() => handleAnswerSelect(currentQuestionIndex, option)}
                                            className={`w-full p-4 rounded-lg text-left transition-all duration-200 border-2 ${
                                                userAnswers[currentQuestionIndex] === option
                                                    ? 'bg-pink-500 border-pink-700 text-white shadow-lg'
                                                    : 'bg-white/50 dark:bg-white/10 border-slate-300 dark:border-slate-400 hover:bg-pink-100 dark:hover:bg-white/20'
                                            }`}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            {option}
                                        </motion.button>
                                    ))}
                                </div>
                                <div className="mt-8 text-right">
                                    <button
                                        onClick={handleNextQuestion}
                                        disabled={!userAnswers[currentQuestionIndex]}
                                        className="px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                );
            case 'results':
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-4xl"
                    >
                        <div className="p-8 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 text-center">
                            <Award className="w-20 h-20 mx-auto text-yellow-400" />
                            <h2 className="text-4xl font-bold mt-4">Quiz Complete!</h2>
                            <p className="text-xl mt-2">You scored</p>
                            <p className="text-6xl font-bold my-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
                                {score} / {questions.length}
                            </p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 my-4">
                                <motion.div
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scorePercentage}%` }}
                                    transition={{ duration: 1, ease: "easeInOut" }}
                                />
                            </div>
                            <p className="text-2xl font-bold">{scorePercentage}%</p>
                             <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                                <button
                                    onClick={restartQuiz}
                                    className="px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
                                >
                                    Play Again
                                </button>
                                <button
                                    onClick={getDeepDive}
                                    className="px-8 py-3 font-bold text-purple-600 dark:text-purple-300 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" /> Deep Dive on {topic}
                                </button>
                            </div>
                        </div>
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold text-center mb-4">Review Your Answers</h3>
                            <div className="space-y-4">
                                {questions.map((q, index) => (
                                    <div key={index} className="p-4 bg-white/30 dark:bg-black/20 rounded-lg border border-white/20">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{index + 1}. {q.question}</p>
                                        <p className={`mt-2 flex items-center ${userAnswers[index] === q.answer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {userAnswers[index] === q.answer ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                                            Your answer: {userAnswers[index] || "Not answered"}
                                        </p>
                                        {userAnswers[index] !== q.answer && (
                                            <p className="mt-1 text-green-700 dark:text-green-300 flex items-center">
                                                <CheckCircle className="mr-2" />
                                                Correct answer: {q.answer}
                                            </p>
                                        )}
                                        <div className="text-right mt-2">
                                            <button 
                                                onClick={() => getExplanation(q.question, q.answer)}
                                                className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 justify-end"
                                            >
                                                <Sparkles className="w-4 h-4" /> Explain Answer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <main className={`min-h-screen w-full font-sans text-slate-800 dark:text-slate-200 transition-colors duration-500`}>
             <style>{`
                /* The switch - the box around the slider */
                .switch {
                  font-size: 17px;
                  position: relative;
                  display: inline-block;
                  width: 3.5em;
                  height: 2em;
                }

                /* Hide default HTML checkbox */
                .switch input {
                  opacity: 0;
                  width: 0;
                  height: 0;
                }

                /* The slider */
                .slider {
                  --background: #28096b;
                  position: absolute;
                  cursor: pointer;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: var(--background);
                  transition: .5s;
                  border-radius: 30px;
                }

                .slider:before {
                  position: absolute;
                  content: "";
                  height: 1.4em;
                  width: 1.4em;
                  border-radius: 50%;
                  left: 10%;
                  bottom: 15%;
                  box-shadow: inset 8px -4px 0px 0px #fff000;
                  background: var(--background);
                  transition: .5s;
                }

                input:checked + .slider {
                  background-color: #7dd3fc;
                }

                input:checked + .slider:before {
                  transform: translateX(100%);
                  box-shadow: inset 15px -4px 0px 15px #f97316;
                  background: #7dd3fc;
                }
             `}</style>
             <Aurora
                colorStops={theme === 'dark' ? ["#020617", "#111827", "#4F46E5"] : ["#BFDBFE", "#FBCFE8", "#F9A8D4"]}
                blend={0.5}
                amplitude={1.0}
                speed={0.3}
            />
             <AnimatePresence>
                {modalContent && (
                    <Modal
                        title={modalContent.title}
                        content={modalContent.content}
                        isLoading={modalContent.isLoading}
                        onClose={() => setModalContent(null)}
                    />
                )}
            </AnimatePresence>
            <div className="absolute top-4 right-4 z-10">
                <label className="switch">
                    <input type="checkbox" checked={theme === 'light'} onChange={toggleTheme} />
                    <span className="slider"></span>
                </label>
            </div>
            <div className="relative min-h-screen flex items-center justify-center p-4 z-0">
                {renderContent()}
            </div>
            <div className="absolute bottom-4 right-4 z-10 text-xs font-bold text-slate-600 dark:text-slate-600">
                Designed by Pankaj
            </div>
        </main>
    );
}

export default App;
