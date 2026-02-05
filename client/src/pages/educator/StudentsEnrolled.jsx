import React, { useContext, useEffect, useState } from "react";
import Loading from "../../components/student/Loading";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const StudentsEnrolled = () => {
  const { backendUrl, isEducator, getToken } = useContext(AppContext);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrolledStudents = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(
        backendUrl + "/api/educator/enrolled-students",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setEnrolledStudents((data.enrolledStudents || []).reverse());
      } else {
        setEnrolledStudents([]);
        toast.error(data.message || "Failed to fetch enrolled students");
      }
    } catch (error) {
      setEnrolledStudents([]);
      toast.error(error.message || "Failed to fetch enrolled students");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isEducator) {
      fetchEnrolledStudents();
    } else {
      setLoading(false);
    }
  }, [isEducator]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20 ">
        <table className="table-fixed md:table-auto w-full overflow-hidden pb-4">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">
                #
              </th>
              <th className="px-4 py-3 font-semibold">Student Name</th>
              <th className="px-4 py-3 font-semibold">Course Title</th>
              <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-500">
            {enrolledStudents.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-400"
                  colSpan={4}
                >
                  No students enrolled yet.
                </td>
              </tr>
            ) : (
              enrolledStudents.map((item, index) => (
                <tr key={index} className="border-b border-gray-500/20">
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {index + 1}
                  </td>
                  <td className="md:px-4 px-2 py-3 flex items-center space-x-3">
                    <img
                      src={item.student?.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded-full"
                    />
                    <span className="truncate">
                      {item.student?.name || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 truncate">{item.courseTitle}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {item.purchaseDate
                      ? new Date(item.purchaseDate).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentsEnrolled;
