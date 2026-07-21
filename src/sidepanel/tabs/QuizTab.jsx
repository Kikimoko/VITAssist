import { useState, useEffect } from "react";
import { generateQuiz } from "../../shared/ai/generateQuiz.js";
import {
    getAllSubjectsFromIndex,
    getFilesForSubject,
    saveQuizResult,
    getQuizResults
} from "../../shared/storage/storage.js";
import "./QuizTab.css";
import Dropdown from "./Dropdown.jsx";
import "./Dropdown.css";

export default function QuizTab() {

    const [quiz, setQuiz] = useState([]);
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState(0);

    const [selected, setSelected] = useState(null);
    const [quizStartTime, setQuizStartTime] = useState(0);
const [quizEndTime, setQuizEndTime] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    const [answers, setAnswers] = useState([]);
    const [finished, setFinished] = useState(false);
    const [filename, setFilename] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [files, setFiles] = useState([]);

    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedFile, setSelectedFile] = useState("");
    const [history, setHistory] = useState([]);
    const [expanded, setExpanded] = useState({});
    useEffect(() => {
        loadSubjects();
        chrome.storage.local.get(
            "vitassist_active_file",
            result => {

                console.log(result);

                if (result.vitassist_active_file) {

                    setFilename(result.vitassist_active_file);

                }

            }

        );

    }, []);
    useEffect(() => {

        if (!selectedFile) {
    
            setHistory([]);
    
            return;
    
        }
    
        async function loadHistory() {
    
            const data = await getQuizResults(selectedFile);
    
            setHistory(data);
    
        }
    
        loadHistory();
    
    }, [selectedFile]);
    async function loadSubjects() {

        const list = await getAllSubjectsFromIndex();

        setSubjects(list);

    }
    async function loadFiles(subject) {

        const list = await getFilesForSubject(subject);

        setFiles(list);

    }
    async function startQuiz() {

        if (!selectedFile) {
    
            alert("Select a lecture first.");
    
            return;
    
        }
    
        setLoading(true);
    
        try {
    
            console.log("Generating:", selectedFile);
    
            const data = await generateQuiz(selectedFile);
    
            setQuiz(data);
    
            setCurrent(0);
    
            setAnswers([]);
    
            setSelected(null);
    
            setFinished(false);
    
            setFilename(selectedFile);
            setQuizStartTime(Date.now());
setQuizEndTime(0);
    
        } catch (err) {
    
            console.error(err);
    
        }
    
        setLoading(false);
    
    }
    function nextQuestion() {

        // First click = Check Answer
        if (!showAnswer) {

            const updated = [...answers];

            updated[current] = selected;

            setAnswers(updated);

            setShowAnswer(true);

            return;
        }

        // Second click = Continue
        setShowAnswer(false);

        setSelected(null);

        if (current === quiz.length - 1) {

            const end = Date.now();

setQuizEndTime(end);

const totalSeconds = Math.floor((end - quizStartTime) / 1000);

let score = 0;

quiz.forEach((q, i) => {

    if (answers[i] === q.answer)

        score++;

});

const accuracy = Math.round(

    (score / quiz.length) * 100

);

saveQuizResult(filename, {

    date: end,

    score,

    total: quiz.length,

    accuracy,

    totalTime: totalSeconds,

    averageTime: Math.round(totalSeconds / quiz.length),

    answers

});

setFinished(true);
        
        } else {

            setCurrent(current + 1);

        }

    }

    if (loading) {

        return (
            <div className="tab-pane">
                <h2>🧠 Generating Quiz...</h2>
            </div>
        );

    }

    if (finished) {

        let score = 0;
    
        quiz.forEach((item, i) => {
            if (answers[i] === item.answer) score++;
        });
    
        const incorrect = quiz.length - score;
        const accuracy = Math.round((score / quiz.length) * 100);
    
        const totalSeconds = Math.floor((quizEndTime - quizStartTime) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const average = Math.round(totalSeconds / quiz.length);
    
        return (
            <div className="tab-pane quiz-page">
    
                <div className="quiz-summary-card">
    
                    <div className="quiz-score">
                        <h1>{score}/{quiz.length}</h1>
                        <p>Accuracy {accuracy}%</p>
                    </div>
    
                    <div className="quiz-progress">
                        <div
                            className="quiz-progress-fill"
                            style={{ width: `${accuracy}%` }}
                        />
                    </div>
    
                    <div className="quiz-stats">
    
                        <div className="quiz-stat">
                            <div className="quiz-stat-value">{score}</div>
                            <div className="quiz-stat-label">✅ Correct</div>
                        </div>
    
                        <div className="quiz-stat">
                            <div className="quiz-stat-value">{incorrect}</div>
                            <div className="quiz-stat-label">❌ Incorrect</div>
                        </div>
    
                        <div className="quiz-stat">
                            <div className="quiz-stat-value">
                                {minutes}m {seconds}s
                            </div>
                            <div className="quiz-stat-label">⏱ Time</div>
                        </div>
    
                        <div className="quiz-stat">
                            <div className="quiz-stat-value">
                                {average}s
                            </div>
                            <div className="quiz-stat-label">⚡ Avg / Question</div>
                        </div>
    
                    </div>
    
                </div>
    
                <h2 className="review-title">Review</h2>
    
                <div className="quiz-review">
    
                    {quiz.map((item, i) => {
    
                        const correct = answers[i] === item.answer;
    
                        return (
    
                            <div
                                key={i}
                                className={`quiz-review-card ${
                                    correct ? "correct-card" : "wrong-card"
                                }`}
                            >
    
                                <div
                                    className="quiz-review-header"
                                    onClick={() =>
                                        setExpanded(prev => ({
                                            ...prev,
                                            [i]: !prev[i]
                                        }))
                                    }
                                >
    
                                    <h3>
                                        {correct ? "✅" : "❌"} Question {i + 1}
                                    </h3>
    
                                    <span>
                                        {expanded[i] ? "▲" : "▼"}
                                    </span>
    
                                </div>
    
                                {expanded[i] && (
    
                                    <div className="quiz-review-body">
    
                                        <div className="quiz-question">
                                            {item.question}
                                        </div>
    
                                        <p>
                                            <span className="answer-label">
                                                Your Answer
                                            </span>
                                            <br />
                                            {answers[i] != null
                                                ? item.options[answers[i]]
                                                : "Not Answered"}
                                        </p>
    
                                        <p>
                                            <span className="answer-label">
                                                Correct Answer
                                            </span>
                                            <br />
                                            {item.options[item.answer]}
                                        </p>
    
                                        <div className="explanation">
                                            💡 {item.explanation}
                                        </div>
    
                                    </div>
    
                                )}
    
                            </div>
    
                        );
    
                    })}
    
                </div>
    
                <button
                    className="quiz-restart"
                    onClick={() => {
    
                        setQuiz([]);
                        setFinished(false);
                        setCurrent(0);
                        setAnswers([]);
                        setSelected(null);
                        setShowAnswer(false);
                        setExpanded({});
    
                    }}
                >
                    🔄 Take Another Quiz
                </button>
    
            </div>
        );
    }
    
    const attempts = history.length;

const bestScore =
    attempts
        ? Math.max(...history.map(h => h.score))
        : 0;

const averageScore =
    attempts
        ? Math.round(
            history.reduce((s, h) => s + h.accuracy, 0)
            / attempts
        )
        : 0;

const bestTime =
    attempts
        ? Math.min(...history.map(h => h.totalTime))
        : 0;

const totalQuestions =
    history.reduce((s, h) => s + h.total, 0);

const totalCorrect =
    history.reduce((s, h) => s + h.score, 0);
    if (quiz.length === 0) {

        return (
    
            <div className="quiz-home">
    
                <div className="quiz-home-header">
    
                    <h1>AI Quiz</h1>
    
                    <p>
                        Generate personalized quizzes from your lecture notes.
                    </p>
    
                </div>
    
                <div className="quiz-home-card">
    
                    <label>Subject</label>
    
                    <label>Subject</label>

<Dropdown
    value={selectedSubject}
    placeholder="Select Subject"
    options={subjects.map(s => ({ value: s, label: s }))}
    onChange={async (subject) => {
        setSelectedSubject(subject);
        setSelectedFile("");
        await loadFiles(subject);
    }}
/>
    
<label>Lecture</label>

<Dropdown
    value={selectedFile}
    placeholder="Select Lecture"
    options={files.map(f => ({
        value: f.filename,
        label: f.filename.replace(".pdf", "").replace(".pptx", "").replace(".ppt", "")
    }))}
    onChange={setSelectedFile}
/>
                    {selectedFile && history.length > 0 && (

<div className="quiz-dashboard">

    <h3>📊 Quiz Performance</h3>

    <div className="quiz-stats-grid">

        <div>

            <h4>{attempts}</h4>

            <span>Attempts</span>

        </div>

        <div>

            <h4>{averageScore}%</h4>

            <span>Average</span>

        </div>

        <div>

            <h4>{bestScore}</h4>

            <span>Best Score</span>

        </div>

        <div>

            <h4>{bestTime}s</h4>

            <span>Best Time</span>

        </div>

        <div>

            <h4>{totalQuestions}</h4>

            <span>Questions</span>

        </div>

        <div>

            <h4>{totalCorrect}</h4>

            <span>Correct</span>

        </div>

    </div>

</div>

)}
                    <button
                        className="quiz-start-btn"
                        disabled={!selectedFile}
                        onClick={startQuiz}
                    >
                        Generate Quiz
                    </button>
    
                </div>
    
            </div>
    
        );
    
    }

    const q = quiz[current];

    return (

        <div className="tab-pane">

            <div className="quiz-header">

                <div className="quiz-subject">

                📄 {selectedFile
    .replace(".pdf","")
    .replace(".pptx","")
    .replace(".ppt","")}

                </div>

                <div className="quiz-count">

                    Question {current + 1} of {quiz.length}

                </div>
                <div className="quiz-progress">

    <div
        className="quiz-progress-fill"
        style={{
            width:`${((current+1)/quiz.length)*100}%`
        }}
    />

</div>

            </div>

            <div className="quiz-question-card">

                <h2>

                    {q.question}

                </h2>

            </div>

            {q.options.map((option, index) => (

                <button

                    key={index}

                    className={
                        "quiz-option " +

                        (

                            showAnswer

                                ? index === q.answer

                                    ? "correct"

                                    : index === selected

                                        ? "wrong"

                                        : ""

                                : index === selected

                                    ? "selected"

                                    : ""

                        )

                    }

                    disabled={showAnswer}

                    onClick={() => setSelected(index)}

                >

                    {option}

                </button>

            ))}
            {showAnswer && (

                <div className="quiz-explanation">

                    <h3>

                        {selected === q.answer
                            ? "✅ Correct!"
                            : "❌ Incorrect"}

                    </h3>

                    <p>
                        <strong>Correct Answer:</strong>{" "}
                        {q.options[q.answer]}
                    </p>

                    <p>
                        💡 {q.explanation}
                    </p>

                </div>

            )}

            <button

                className="quiz-next-btn"

                disabled={selected === null}

                onClick={nextQuestion}

            >

                {showAnswer

                    ? current === quiz.length - 1

                        ? "Finish Quiz"

                        : "Continue"

                    : "Check Answer"}

            </button>

        </div>

    );

}